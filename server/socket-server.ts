'use strict'

/**
 * Pookie Sumo Ball - Minimal authoritative lobby socket server (in-memory)
 * NOTE: This is a scaffold intended to be deployed separately (e.g., Render).
 * It implements house-hosted static lobbies, ready/wager flow, countdown, and match start.
 */

import http from 'http'
import express from 'express'
import { Server } from 'socket.io'
import crypto from 'crypto'
import { HARDCODED_LOBBIES } from '../shared/hardcoded-lobbies'
import type { ClientToServer, ServerToClient, UIRoomPlayer, GameStartPacket } from '../shared/contracts'
import { getTransactionDetails, solToLamports } from '../lib/solana-utils'
import EscrowService from '../lib/escrow-service'
import { payoutFromEscrow } from '../lib/payout-service'
import { refundFromEscrow } from '../lib/refund-service'

type LobbyId = string
type Wallet = string

interface PlayerState {
  socketId: string
  wallet: Wallet
  username: string
  ready: boolean
  wagerLocked: boolean
  txSignature?: string
  escrowAddress?: string
  wagerAmountSol?: number
  refunded?: boolean
}

interface LobbyState {
  id: LobbyId
  capacity: number
  wager: number
  players: Map<Wallet, PlayerState>
  countdown: number | null
  countdownTimer?: NodeJS.Timeout
}

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

// Active matches (for payout after game end)
type MatchId = string
interface ActiveMatch {
  id: MatchId
  lobbyId: LobbyId
  wagerPerPlayer: number
  players: Array<{ wallet: string; username: string; escrowAddress: string; amountSol: number }>
}
const activeMatches = new Map<MatchId, ActiveMatch>()
const lastMatchByLobby = new Map<LobbyId, MatchId>()
const processedRefunds = new Set<string>() // track by txSignature to avoid duplicates

// Build in-memory lobbies from hardcoded list
const lobbies = new Map<LobbyId, LobbyState>()
for (const l of HARDCODED_LOBBIES) {
  lobbies.set(l.id, {
    id: l.id,
    capacity: l.capacity,
    wager: l.wager,
    players: new Map(),
    countdown: null,
  })
}

function walletShort(wallet: string) {
  return wallet.length > 8 ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : wallet
}

function broadcastLobby(lobby: LobbyState) {
  const players: UIRoomPlayer[] = Array.from(lobby.players.values()).map((p) => ({
    id: p.wallet,
    username: p.username,
    walletShort: walletShort(p.wallet),
    wager: lobby.wager,
    wagerConfirmed: p.wagerLocked,
    ready: p.ready,
  }))
  const message: ServerToClient = {
    type: 'lobby_state',
    lobbyId: lobby.id,
    players,
    countdown: lobby.countdown ?? undefined,
    status: lobby.countdown !== null ? 'countdown' : 'open',
  }
  io.to(lobby.id).emit('message', message)
}

function clearCountdown(lobby: LobbyState) {
  if (lobby.countdownTimer) clearInterval(lobby.countdownTimer)
  lobby.countdownTimer = undefined
  lobby.countdown = null
}

function tryStartCountdown(lobby: LobbyState) {
  if (lobby.countdown !== null) return
  const players = Array.from(lobby.players.values())
  if (players.length === 0) return

  const readyCount = players.filter((p) => p.ready).length
  const majority = Math.ceil(players.length / 2)
  const allWagered = players.every((p) => p.wagerLocked)

  if (readyCount >= majority && allWagered) {
    lobby.countdown = 5
    broadcastLobby(lobby)
    lobby.countdownTimer = setInterval(() => {
      // Auto-kick unready/unwagered during countdown (refund paid-but-unready)
      for (const [wallet, p] of lobby.players.entries()) {
        if (!p.ready || !p.wagerLocked) {
          if (lobby.wager > 0 && p.wagerLocked && p.escrowAddress && p.wagerAmountSol) {
            const sigKey = p.txSignature || `${wallet}-${lobby.id}`
            if (sigKey && !processedRefunds.has(sigKey)) {
              (async () => {
                try {
                  console.log(`↩️ Refunding (kick) ${p.wagerAmountSol} SOL to ${wallet} from ${p.escrowAddress}`)
                  await refundFromEscrow({
                    escrowPublicKey: p.escrowAddress!,
                    playerPublicKey: wallet,
                    amountSol: p.wagerAmountSol!,
                  })
                  processedRefunds.add(sigKey)
                } catch (e) {
                  console.error('❌ Refund failed on kick:', e)
                }
              })()
            }
          }
          lobby.players.delete(wallet)
        }
      }
      if (lobby.players.size === 0) {
        clearCountdown(lobby)
        broadcastLobby(lobby)
        return
      }
      if ((lobby.countdown ?? 0) <= 0) {
        clearCountdown(lobby)
        startMatch(lobby)
        return
      }
      lobby.countdown = (lobby.countdown ?? 1) - 1
      broadcastLobby(lobby)
    }, 1000)
  }
}

function startMatch(lobby: LobbyState) {
  const seed = crypto.randomInt(0, 2 ** 31 - 1)
  const matchId = crypto.randomUUID()
  const players = Array.from(lobby.players.values())

  // Snapshot for payout later
  const snapshot: ActiveMatch = {
    id: matchId,
    lobbyId: lobby.id,
    wagerPerPlayer: lobby.wager,
    players: players
      .filter((p) => p.wagerLocked && p.escrowAddress)
      .map((p) => ({
        wallet: p.wallet,
        username: p.username,
        escrowAddress: p.escrowAddress as string,
        amountSol: p.wagerAmountSol ?? lobby.wager,
      })),
  }
  activeMatches.set(matchId, snapshot)
  lastMatchByLobby.set(lobby.id, matchId)

  const payload: GameStartPacket = {
    matchId,
    seed,
    players: players.map((p, i) => ({
      id: p.wallet,
      username: p.username,
      skin: 'default',
      spawnIndex: i,
    })),
    wagerAmount: lobby.wager,
    gameMode: HARDCODED_LOBBIES.find((h) => h.id === lobby.id)?.gameMode ?? 'SMALL_SUMO',
    serverTimestamp: Date.now(),
  }
  const message: ServerToClient = { type: 'match_start', payload }
  io.to(lobby.id).emit('message', message)

  // Reset lobby after match start (or move to active match tracking)
  lobby.players.clear()
  clearCountdown(lobby)
  broadcastLobby(lobby)
}

io.on('connection', (socket) => {
  // Optional identity registration ACK (client emits this)
  socket.on('register_identity', (_wallet: string) => {
    try {
      socket.emit('identity_registered')
    } catch {}
  })

  // Provide on-demand lobby snapshot for a single client
  socket.on('get_lobby_state', (lobbyId: LobbyId) => {
    const lobby = lobbies.get(lobbyId)
    if (!lobby) return
    const players: UIRoomPlayer[] = Array.from(lobby.players.values()).map((p) => ({
      id: p.wallet,
      username: p.username,
      walletShort: walletShort(p.wallet),
      wager: lobby.wager,
      wagerConfirmed: p.wagerLocked,
      ready: p.ready,
    }))
    const message: ServerToClient = {
      type: 'lobby_state',
      lobbyId: lobby.id,
      players,
      countdown: lobby.countdown ?? undefined,
      status: lobby.countdown !== null ? 'countdown' : 'open',
    }
    socket.emit('message', message)
  })

  socket.on('message', (data: ClientToServer) => {
    try {
      if (data.type === 'join_lobby') {
        const lobby = lobbies.get(data.lobbyId)
        if (!lobby) return socket.emit('message', { type: 'error', message: 'Lobby not found', code: 'ERR_NOT_FOUND' } as ServerToClient)
        if (lobby.players.size >= lobby.capacity) return socket.emit('message', { type: 'error', message: 'Lobby full', code: 'ERR_LOBBY_FULL' } as ServerToClient)
        // Join room and add/replace state
        socket.join(lobby.id)
        lobby.players.set(data.wallet, { socketId: socket.id, wallet: data.wallet, username: data.username, ready: false, wagerLocked: false })
        broadcastLobby(lobby)
      }
      if (data.type === 'confirm_wager') {
        const lobby = lobbies.get(data.lobbyId); if (!lobby) return
        const player = Array.from(lobby.players.values()).find((x) => x.socketId === socket.id)
        if (!player) return
        
        // Verify transaction on-chain (amount and recipient)
        (async () => {
          try {
            const signature = data.txSignature
            if (!signature) {
              socket.emit('message', { type: 'error', message: 'Missing transaction signature', code: 'ERR_NO_SIG' } as ServerToClient)
              return
            }

            // Fetch transaction
            const tx = await getTransactionDetails(signature)
            if (!tx || !tx.meta || !tx.transaction) {
              socket.emit('message', { type: 'error', message: 'Transaction not found or not confirmed', code: 'ERR_TX_NOT_FOUND' } as ServerToClient)
              return
            }

            // Resolve escrow wallet addresses from DB
            const { walletA, walletB } = await EscrowService.getAllWallets()
            const escrowCandidates = new Set([walletA, walletB].filter(Boolean))

            // Map account keys to indexes
            const keys = tx.transaction.message.accountKeys.map((k: any) => (typeof k === 'string' ? k : k.pubkey?.toString?.() || String(k)))
            const playerIndex = keys.findIndex((k: string) => k?.toLowerCase?.() === player.wallet.toLowerCase())
            const escrowIndex = keys.findIndex((k: string) => escrowCandidates.has(k))

            if (playerIndex === -1 || escrowIndex === -1) {
              socket.emit('message', { type: 'error', message: 'Transaction participants mismatch', code: 'ERR_PARTICIPANTS' } as ServerToClient)
              return
            }

            const pre = tx.meta.preBalances
            const post = tx.meta.postBalances

            // Compute deltas (lamports)
            const playerDelta = pre[playerIndex] - post[playerIndex] // includes fee
            const escrowDelta = post[escrowIndex] - pre[escrowIndex]

            const expectedLamports = solToLamports(lobby.wager)

            // Validate escrow received the exact wager amount (player pays fee separately)
            const escrowMatches = escrowDelta === expectedLamports
            if (!escrowMatches) {
              socket.emit('message', { type: 'error', message: 'Wager amount mismatch', code: 'ERR_AMOUNT' } as ServerToClient)
              return
            }

            // Mark locked and store signature
            player.txSignature = signature
            player.wagerLocked = true
            player.escrowAddress = keys[escrowIndex]
            player.wagerAmountSol = lobby.wager

            console.log(`✅ Wager verified: ${player.username} -> ${keys[escrowIndex]} (+${lobby.wager} SOL)`)

            broadcastLobby(lobby)
            tryStartCountdown(lobby)
          } catch (e: any) {
            console.error('❌ Wager verification failed:', e?.message || e)
            socket.emit('message', { type: 'error', message: 'Failed to verify wager transaction', code: 'ERR_VERIFY' } as ServerToClient)
          }
        })()
      }
      if (data.type === 'set_ready') {
        const lobby = lobbies.get(data.lobbyId); if (!lobby) return
        const player = Array.from(lobby.players.values()).find((x) => x.socketId === socket.id)
        if (!player) return
        // Enforce wager lock on paid lobbies
        if (lobby.wager > 0 && !player.wagerLocked && data.ready) {
          socket.emit('message', { type: 'error', message: 'Submit wager before readying', code: 'ERR_WAGER_REQUIRED' } as ServerToClient)
          return
        }
        player.ready = data.ready
        broadcastLobby(lobby)
        tryStartCountdown(lobby)
      }
      if (data.type === 'admin_end_match') {
        // Admin-only manual payout trigger
        // Determine caller wallet by socket
        let callerWallet: string | null = null
        for (const lobby of lobbies.values()) {
          for (const p of lobby.players.values()) {
            if (p.socketId === socket.id) {
              callerWallet = p.wallet
              break
            }
          }
          if (callerWallet) break
        }
        const adminWallet = (process.env.NEXT_PUBLIC_ADMIN_WALLET || process.env.ADMIN_WALLET || '').toLowerCase()
        if (!callerWallet || callerWallet.toLowerCase() !== adminWallet) {
          socket.emit('message', { type: 'error', message: 'Unauthorized admin action', code: 'ERR_UNAUTHORIZED' } as ServerToClient)
          return
        }

        const matchId = (data as any).matchId as string | undefined
        const winner = (data as any).winnerWallet as string | undefined
        if (!matchId || !winner) {
          socket.emit('message', { type: 'error', message: 'Missing matchId or winner', code: 'ERR_BAD_REQUEST' } as ServerToClient)
          return
        }

        (async () => {
          try {
            const match = activeMatches.get(matchId)
            if (!match) throw new Error('Match not found')

            // Group contributions by escrow
            const byEscrow = new Map<string, number>()
            for (const p of match.players) {
              byEscrow.set(p.escrowAddress, (byEscrow.get(p.escrowAddress) || 0) + p.amountSol)
            }

            const housePct = Number(process.env.HOUSE_CUT_PERCENTAGE ?? '0.04')
            const admin = process.env.NEXT_PUBLIC_ADMIN_WALLET || process.env.ADMIN_WALLET
            if (!admin) throw new Error('Admin wallet not configured')

            // Execute payouts per escrow wallet
            for (const [escrow, pot] of byEscrow.entries()) {
              await payoutFromEscrow({
                escrowPublicKey: escrow,
                winnerPublicKey: winner,
                totalPotSol: pot,
                adminWalletPublicKey: admin,
                houseCutPercentage: housePct,
              })
            }

            console.log(`🏁 Payout complete for match ${matchId} → winner ${winner}`)
            activeMatches.delete(matchId)
            // No broadcast necessary here
          } catch (e: any) {
            console.error('❌ Admin payout failed:', e?.message || e)
            socket.emit('message', { type: 'error', message: 'Payout failed', code: 'ERR_PAYOUT' } as ServerToClient)
          }
        })()
      }
      if (data.type === 'match_result') {
        // Game client reports winner at end of match
        const matchId = (data as any).matchId as string | undefined
        const winner = (data as any).winnerWallet as string | undefined
        if (!matchId || !winner) return
        ;(async () => {
          try {
            const match = activeMatches.get(matchId)
            if (!match) return

            const byEscrow = new Map<string, number>()
            for (const p of match.players) {
              byEscrow.set(p.escrowAddress, (byEscrow.get(p.escrowAddress) || 0) + p.amountSol)
            }

            const housePct = Number(process.env.HOUSE_CUT_PERCENTAGE ?? '0.04')
            const admin = process.env.NEXT_PUBLIC_ADMIN_WALLET || process.env.ADMIN_WALLET
            if (!admin) throw new Error('Admin wallet not configured')

            for (const [escrow, pot] of byEscrow.entries()) {
              await payoutFromEscrow({
                escrowPublicKey: escrow,
                winnerPublicKey: winner,
                totalPotSol: pot,
                adminWalletPublicKey: admin,
                houseCutPercentage: housePct,
              })
            }
            console.log(`🏁 Auto payout complete for match ${matchId} → winner ${winner}`)
            activeMatches.delete(matchId)
          } catch (e) {
            console.error('❌ Auto payout failed:', e)
          }
        })()
      }
      if (data.type === 'leave_lobby') {
        const lobby = lobbies.get(data.lobbyId); if (!lobby) return
        // Remove by socket id (and auto-refund if eligible and before match start)
        for (const [wallet, p] of lobby.players.entries()) {
          if (p.socketId === socket.id) {
            const shouldRefund = lobby.wager > 0 && p.wagerLocked && !p.refunded && (lobby.countdown === null)
            const sigKey = p.txSignature || `${wallet}-${lobby.id}`
            if (shouldRefund && sigKey && !processedRefunds.has(sigKey) && p.escrowAddress && p.wagerAmountSol) {
              (async () => {
                try {
                  console.log(`↩️ Refunding ${p.wagerAmountSol} SOL to ${wallet} from ${p.escrowAddress}`)
                  await refundFromEscrow({
                    escrowPublicKey: p.escrowAddress,
                    playerPublicKey: wallet,
                    amountSol: p.wagerAmountSol,
                  })
                  processedRefunds.add(sigKey)
                } catch (e) {
                  console.error('❌ Refund failed on leave:', e)
                }
              })()
            }
            lobby.players.delete(wallet)
          }
        }
        socket.leave(lobby.id)
        broadcastLobby(lobby)
      }
      if (data.type === 'reconnect') {
        const lobby = lobbies.get(data.lobbyId); if (!lobby) return
        socket.join(lobby.id)
        broadcastLobby(lobby)
      }
    } catch (e) {
      socket.emit('message', { type: 'error', message: (e as Error).message, code: 'ERR_INTERNAL' } as ServerToClient)
    }
  })

  socket.on('disconnect', () => {
    // Remove player from any lobby
    for (const lobby of lobbies.values()) {
      let changed = false
      for (const [wallet, p] of lobby.players.entries()) {
        if (p.socketId === socket.id) {
          lobby.players.delete(wallet)
          changed = true
        }
      }
      if (changed) broadcastLobby(lobby)
    }
  })
})

const PORT = process.env.PORT || 4001
app.get('/health', (_req, res) => res.json({ ok: true }))
server.listen(PORT, () => console.log(`[sumo-socket] listening on ${PORT}`))


