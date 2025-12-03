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
import { getSupabaseAdmin } from '../lib/supabase-admin'

type LobbyId = string
type Wallet = string
type GamePhase = 'WAITING' | 'STARTING_COUNTDOWN' | 'ACTIVE' | 'ROUND_OVER' | 'GAME_OVER'

interface GameStatusUpdatePayloadPayload {
  gameState: GamePhase
  players?: Array<{
    id: string
    username: string
    status: 'In' | 'Out'
    position?: { x: number; y: number; z: number }
    quaternion?: { x: number; y: number; z: number; w: number }
  }>
  winnerInfo?: { id: string; username: string; score?: number }
  countdown?: number | null
  message?: string
}

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
  isAi?: boolean
}

interface LobbyState {
  id: LobbyId
  capacity: number
  wager: number
  players: Map<Wallet, PlayerState>
  countdown: number | null
  countdownTimer?: NodeJS.Timeout
  aiFillTimer?: NodeJS.Timeout
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
  roster?: Array<{ wallet: string; username: string; isAi?: boolean }>
  startedAt?: number
}
const activeMatches = new Map<MatchId, ActiveMatch>()
const lastMatchByLobby = new Map<LobbyId, MatchId>()
const processedRefunds = new Set<string>() // track by txSignature to avoid duplicates
const socketToMatch = new Map<string, string>() // map socket.id -> matchId
const socketToLobby = new Map<string, LobbyId>()

const supabase = getSupabaseAdmin()
const MAX_PAYMENT_ATTEMPTS = 5

async function ensureSeedLobbies() {
  try {
    const records = HARDCODED_LOBBIES.map((l) => ({
      id: l.id,
      name: l.name,
      wager_amount: l.wager,
      max_players: l.capacity,
      status: 'open',
    }))
    await supabase.from('lobbies').upsert(records, { onConflict: 'id' })
  } catch (error) {
    console.error('[supabase] Failed to seed lobbies', error)
  }
}

async function upsertLobbyPlayerRecord(lobbyId: LobbyId, player: PlayerState) {
  if (player.isAi) return
  try {
    await supabase
      .from('lobby_players')
      .upsert(
        {
          lobby_id: lobbyId,
          wallet_address: player.wallet,
          username: player.username,
          is_ready: player.ready,
          wager_amount: player.wagerAmountSol ?? null,
          wager_confirmed: player.wagerLocked,
        },
        { onConflict: 'lobby_id,wallet_address' },
      )
  } catch (error) {
    console.error('[supabase] Failed to upsert lobby player', { lobbyId, wallet: player.wallet, error })
  }
}

async function updateLobbyPlayerReady(lobbyId: LobbyId, wallet: Wallet, ready: boolean) {
  try {
    await supabase
      .from('lobby_players')
      .update({ is_ready: ready })
      .eq('lobby_id', lobbyId)
      .eq('wallet_address', wallet)
  } catch (error) {
    console.error('[supabase] Failed to update ready state', { lobbyId, wallet, error })
  }
}

async function updateLobbyPlayerWager(lobbyId: LobbyId, wallet: Wallet, amount: number | undefined, confirmed: boolean, txSignature?: string) {
  try {
    await supabase
      .from('lobby_players')
      .update({ wager_amount: amount ?? null, wager_confirmed: confirmed })
      .eq('lobby_id', lobbyId)
      .eq('wallet_address', wallet)
  } catch (error) {
    console.error('[supabase] Failed to update wager state', { lobbyId, wallet, error })
  }
  if (txSignature) {
    try {
      await supabase
        .from('wager_events')
        .upsert(
          {
            lobby_id: lobbyId,
            wallet_address: wallet,
            amount: amount ?? 0,
            tx_signature: txSignature,
            status: 'locked',
          },
          { onConflict: 'tx_signature' },
        )
    } catch (error) {
      console.error('[supabase] Failed to upsert wager event', { lobbyId, wallet, txSignature, error })
    }
  }
}

async function removeLobbyPlayerRecord(lobbyId: LobbyId, wallet: Wallet) {
  if (wallet.startsWith('ai-')) return
  try {
    await supabase
      .from('lobby_players')
      .delete()
      .eq('lobby_id', lobbyId)
      .eq('wallet_address', wallet)
  } catch (error) {
    console.error('[supabase] Failed to remove lobby player', { lobbyId, wallet, error })
  }
}

async function clearLobbyPlayersRecord(lobbyId: LobbyId) {
  try {
    await supabase
      .from('lobby_players')
      .delete()
      .eq('lobby_id', lobbyId)
  } catch (error) {
    console.error('[supabase] Failed to clear lobby players', { lobbyId, error })
  }
}

async function syncLobbyPlayerCountDb(lobbyId: LobbyId) {
  try {
    const { count, error } = await supabase
      .from('lobby_players')
      .select('id', { count: 'exact', head: true })
      .eq('lobby_id', lobbyId)
    if (error) throw error
    await supabase
      .from('lobbies')
      .update({ current_players: count ?? 0 })
      .eq('id', lobbyId)
  } catch (error) {
    console.error('[supabase] Failed to sync lobby player count', { lobbyId, error })
  }
}

async function updateLobbyStatusDb(lobbyId: LobbyId, status: string) {
  try {
    await supabase
      .from('lobbies')
      .update({ status })
      .eq('id', lobbyId)
  } catch (error) {
    console.error('[supabase] Failed to update lobby status', { lobbyId, status, error })
  }
}

ensureSeedLobbies().catch((error) => console.error('[supabase] Seed error', error))

async function resetLobbyPlayers() {
  try {
    await supabase
      .from('lobby_players')
      .delete()
      .neq('lobby_id', '')
  } catch (error) {
    console.error('[supabase] Failed to reset lobby players on startup', error)
  }
}

resetLobbyPlayers().catch((error) => console.error('[supabase] Reset players error', error))

async function recordMatchStart(matchId: MatchId, lobbyId: LobbyId, gameMode: string, seed: number, roster: Array<{ wallet: string; username: string; isAi?: boolean }>) {
  try {
    await supabase
      .from('match_state')
      .upsert({
        id: matchId,
        lobby_id: lobbyId,
        game_mode: gameMode,
        seed,
        roster,
        status: 'active',
        started_at: new Date().toISOString(),
      })
  } catch (error) {
    console.error('[supabase] Failed to record match start', { matchId, lobbyId, error })
  }
}

async function recordMatchResult(matchId: MatchId, status: 'completed' | 'cancelled', winnerWallet?: string) {
  try {
    await supabase
      .from('match_state')
      .update({
        status,
        winner_wallet: winnerWallet ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', matchId)
  } catch (error) {
    console.error('[supabase] Failed to record match result', { matchId, status, winnerWallet, error })
  }
}

async function insertTransactionRecord(wallet: string | null, type: string, amount: number, relatedId: string | null, description: string | null, txSignature: string | null) {
  try {
    await supabase
      .from('transactions')
      .insert({
        wallet_address: wallet,
        transaction_type: type,
        amount,
        related_entity_id: relatedId,
        description,
        tx_signature: txSignature,
      })
  } catch (error) {
    console.error('[supabase] Failed to insert transaction', { wallet, type, amount, relatedId, error })
  }
}

async function updateWagerEventStatus(txSignature: string, status: string) {
  try {
    await supabase
      .from('wager_events')
      .update({ status })
      .eq('tx_signature', txSignature)
  } catch (error) {
    console.error('[supabase] Failed to update wager event status', { txSignature, status, error })
  }
}

async function enqueuePaymentJob(jobType: 'payout' | 'refund', payload: Record<string, any>) {
  const { data, error } = await supabase
    .from('payment_jobs')
    .insert({ job_type: jobType, payload })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

async function claimPendingJobs(limit = 5) {
  const { data, error } = await supabase
    .from('payment_jobs')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lt('attempts', MAX_PAYMENT_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) {
    console.error('[supabase] Failed to fetch payment jobs', error)
    return []
  }
  return data ?? []
}

async function markJobProcessing(id: string, currentStatus: string) {
  const { data, error } = await supabase
    .from('payment_jobs')
    .update({ status: 'processing' })
    .eq('id', id)
    .eq('status', currentStatus)
    .select('id')
  if (error) {
    console.error('[supabase] Failed to mark job processing', { id, error })
    return false
  }
  return (data ?? []).length > 0
}

async function finalizeJob(id: string, status: 'completed' | 'failed', attempts: number, lastError?: string | null, extraPayload?: Record<string, any>) {
  const update: Record<string, any> = {
    status,
    attempts,
    last_error: lastError ?? null,
  }
  if (status === 'completed') {
    update.processed_at = new Date().toISOString()
  }
  if (extraPayload) {
    update.payload = extraPayload
  }
  const { error } = await supabase
    .from('payment_jobs')
    .update(update)
    .eq('id', id)
  if (error) {
    console.error('[supabase] Failed to finalize job', { id, status, error })
  }
}

async function processPaymentJobsOnce() {
  const jobs = await claimPendingJobs(5)
  for (const job of jobs) {
    const claimed = await markJobProcessing(job.id, job.status)
    if (!claimed) continue
    const payload = job.payload || {}
    let attempts = (job.attempts ?? 0) + 1
    try {
      if (job.job_type === 'payout') {
        const { escrowPublicKey, winnerPublicKey, totalPotSol, adminWalletPublicKey, houseCutPercentage, matchId } = payload
        const result = await payoutFromEscrow({
          escrowPublicKey,
          winnerPublicKey,
          totalPotSol,
          adminWalletPublicKey,
          houseCutPercentage,
        })
        await insertTransactionRecord(winnerPublicKey, 'win', result.winnerAmountSol, matchId ?? null, 'Match payout', result.signature)
        await insertTransactionRecord(adminWalletPublicKey, 'house_cut', result.houseAmountSol, matchId ?? null, 'House cut', result.signature)
        if (matchId) await recordMatchResult(matchId, 'completed', winnerPublicKey)
        await finalizeJob(job.id, 'completed', attempts, null, { ...payload, signature: result.signature })
      } else if (job.job_type === 'refund') {
        const { escrowPublicKey, playerPublicKey, amountSol, txSignatureKey, description } = payload
        const result = await refundFromEscrow({
          escrowPublicKey,
          playerPublicKey,
          amountSol,
        })
        await insertTransactionRecord(playerPublicKey, 'refund', amountSol, null, description ?? 'Lobby refund', result.signature)
        if (txSignatureKey) await updateWagerEventStatus(txSignatureKey, 'refunded')
        await finalizeJob(job.id, 'completed', attempts, null, { ...payload, signature: result.signature })
      } else {
        throw new Error(`Unknown job type: ${job.job_type}`)
      }
    } catch (error: any) {
      console.error('[payment-job] Failed', { id: job.id, error })
      const lastError = error?.message || String(error)
      await finalizeJob(job.id, attempts >= MAX_PAYMENT_ATTEMPTS ? 'failed' : 'pending', attempts, lastError)
    }
  }
}

setInterval(() => {
  processPaymentJobsOnce().catch((error) => console.error('[payment-jobs] loop error', error))
}, 3000)


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
  void updateLobbyStatusDb(lobby.id, 'open')
}

function tryStartCountdown(lobby: LobbyState) {
  if (lobby.countdown !== null) return
  const players = Array.from(lobby.players.values())
  if (players.length === 0) return

  const readyCount = players.filter((p) => p.ready).length
  const majority = Math.ceil(players.length / 2)
  const allWagered = lobby.wager === 0 ? true : players.every((p) => p.wagerLocked)

  if (readyCount >= majority && allWagered) {
    lobby.countdown = 5
    broadcastLobby(lobby)
    void updateLobbyStatusDb(lobby.id, 'countdown')
    lobby.countdownTimer = setInterval(() => {
      // Auto-kick unready/unwagered during countdown (refund paid-but-unready)
      for (const [wallet, p] of lobby.players.entries()) {
        if (!p.ready || !p.wagerLocked) {
          if (lobby.wager > 0 && p.wagerLocked && p.escrowAddress && p.wagerAmountSol) {
            const sigKey = p.txSignature || `${wallet}-${lobby.id}`
            if (sigKey && !processedRefunds.has(sigKey)) {
              enqueuePaymentJob('refund', {
                escrowPublicKey: p.escrowAddress,
                playerPublicKey: wallet,
                amountSol: p.wagerAmountSol,
                txSignatureKey: sigKey,
                description: 'Auto-refund: countdown kick',
              }).catch((e) => console.error('❌ enqueue refund failed', e))
              processedRefunds.add(sigKey)
            }
          }
          lobby.players.delete(wallet)
          void removeLobbyPlayerRecord(lobby.id, wallet)
        }
      }
      void syncLobbyPlayerCountDb(lobby.id)
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

function fillAiPlayers(lobby: LobbyState) {
  const current = Array.from(lobby.players.values())
  // Count humans
  const humans = current.filter(p => !p.isAi)
  if (humans.length === 0) return
  const needed = Math.max(0, lobby.capacity - current.length)
  let added = 0
  for (let i = 0; i < needed; i++) {
    const id = `ai-${crypto.randomUUID().slice(0, 8)}`
    lobby.players.set(id, {
      socketId: `ai-${id}`,
      wallet: id,
      username: `AI ${i + 1}`,
      ready: true,
      wagerLocked: true,
      isAi: true,
    })
    added++
  }
  if (added > 0) {
    broadcastLobby(lobby)
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
    roster: players.map((p) => ({ wallet: p.wallet, username: p.username, isAi: Boolean(p.isAi) })),
    startedAt: Date.now(),
  }
  activeMatches.set(matchId, snapshot)
  lastMatchByLobby.set(lobby.id, matchId)
  const gameMode = HARDCODED_LOBBIES.find((h) => h.id === lobby.id)?.gameMode ?? 'SMALL_SUMO'
  void recordMatchStart(matchId, lobby.id, gameMode, seed, snapshot.roster ?? [])

  const payload: GameStartPacket = {
    matchId,
    seed,
    players: players.map((p, i) => ({
      id: p.wallet,
      username: p.username,
      skin: 'default',
      spawnIndex: i,
      isAi: Boolean(p.isAi),
    })),
    wagerAmount: lobby.wager,
    gameMode,
    serverTimestamp: Date.now(),
  }
  const message: ServerToClient = { type: 'match_start', payload }
  io.to(lobby.id).emit('message', message)

  // Reset lobby after match start (or move to active match tracking)
  lobby.players.clear()
  void clearLobbyPlayersRecord(lobby.id)
  void syncLobbyPlayerCountDb(lobby.id)
  clearCountdown(lobby)
  broadcastLobby(lobby)
  void updateLobbyStatusDb(lobby.id, 'in_match')
}

io.on('connection', (socket) => {
  // Optional identity registration ACK (client emits this)
  socket.on('register_identity', (wallet: string) => {
    try {
      ;(socket.data as any).wallet = typeof wallet === 'string' ? wallet : ''
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

  socket.on('message', async (data: ClientToServer) => {
    try {
      if (data.type === 'join_lobby') {
        const lobby = lobbies.get(data.lobbyId)
        if (!lobby) return socket.emit('message', { type: 'error', message: 'Lobby not found', code: 'ERR_NOT_FOUND' } as ServerToClient)
        if (lobby.players.size >= lobby.capacity) return socket.emit('message', { type: 'error', message: 'Lobby full', code: 'ERR_LOBBY_FULL' } as ServerToClient)
        // Join room and add/replace state
        socket.join(lobby.id)
        const playerState: PlayerState = { socketId: socket.id, wallet: data.wallet, username: data.username, ready: false, wagerLocked: false }
        lobby.players.set(data.wallet, playerState)
        socketToLobby.set(socket.id, lobby.id)
        ;(socket.data as any).wallet = data.wallet
        await upsertLobbyPlayerRecord(lobby.id, playerState)
        await syncLobbyPlayerCountDb(lobby.id)
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
            await updateLobbyPlayerWager(lobby.id, player.wallet, lobby.wager, true, signature)
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
        await updateLobbyPlayerReady(lobby.id, player.wallet, player.ready)
        // For free lobbies, if at least one human ready and not enough players, schedule AI fill after 10s
        if (lobby.wager === 0) {
          const humansReady = Array.from(lobby.players.values()).filter(p => !p.isAi && p.ready).length
          const totalPlayers = lobby.players.size
          const needsAi = totalPlayers < lobby.capacity && humansReady >= 1
          if (needsAi && !lobby.aiFillTimer) {
            lobby.aiFillTimer = setTimeout(() => {
              lobby.aiFillTimer = undefined
              // If still not enough players, fill AI and start countdown
              const stillHumansReady = Array.from(lobby.players.values()).filter(p => !p.isAi && p.ready).length
              const stillTotal = lobby.players.size
              if (stillHumansReady >= 1 && stillTotal < lobby.capacity) {
                fillAiPlayers(lobby)
                tryStartCountdown(lobby)
              }
            }, 10000)
          }
        }
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

        try {
          const match = activeMatches.get(matchId)
          if (!match) {
            socket.emit('message', { type: 'error', message: 'Match not found', code: 'ERR_NOT_FOUND' } as ServerToClient)
            return
          }
          const byEscrow = new Map<string, number>()
          for (const p of match.players) {
            byEscrow.set(p.escrowAddress, (byEscrow.get(p.escrowAddress) || 0) + p.amountSol)
          }
          const housePct = Number(process.env.HOUSE_CUT_PERCENTAGE ?? '0.04')
          const admin = process.env.NEXT_PUBLIC_ADMIN_WALLET || process.env.ADMIN_WALLET
          if (!admin) throw new Error('Admin wallet not configured')
          for (const [escrow, pot] of byEscrow.entries()) {
            enqueuePaymentJob('payout', {
              escrowPublicKey: escrow,
              winnerPublicKey: winner,
              totalPotSol: pot,
              adminWalletPublicKey: admin,
              houseCutPercentage: housePct,
              matchId,
            }).catch((e) => console.error('❌ enqueue payout failed', e))
          }
          activeMatches.delete(matchId)
        } catch (e: any) {
          console.error('❌ Admin payout enqueue failed:', e?.message || e)
          socket.emit('message', { type: 'error', message: 'Payout enqueue failed', code: 'ERR_PAYOUT' } as ServerToClient)
        }
      }
      if (data.type === 'match_result') {
        // Game client reports winner at end of match
        const matchId = (data as any).matchId as string | undefined
        const winner = (data as any).winnerWallet as string | undefined
        if (!matchId || !winner) return
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
            enqueuePaymentJob('payout', {
              escrowPublicKey: escrow,
              winnerPublicKey: winner,
              totalPotSol: pot,
              adminWalletPublicKey: admin,
              houseCutPercentage: housePct,
              matchId,
            }).catch((e) => console.error('❌ enqueue payout failed', e))
          }
          activeMatches.delete(matchId)
        } catch (e) {
          console.error('❌ Auto payout enqueue failed:', e)
        }
      }
      if (data.type === 'leave_lobby') {
        const lobby = lobbies.get(data.lobbyId); if (!lobby) return
        // Remove by socket id (and auto-refund if eligible and before match start)
        for (const [wallet, p] of lobby.players.entries()) {
          if (p.socketId === socket.id) {
            const shouldRefund = lobby.wager > 0 && p.wagerLocked && !p.refunded && (lobby.countdown === null)
            const sigKey = p.txSignature || `${wallet}-${lobby.id}`
            if (shouldRefund && sigKey && !processedRefunds.has(sigKey) && p.escrowAddress && p.wagerAmountSol) {
              enqueuePaymentJob('refund', {
                escrowPublicKey: p.escrowAddress,
                playerPublicKey: wallet,
                amountSol: p.wagerAmountSol,
                txSignatureKey: sigKey,
                description: 'Auto-refund: player left lobby',
              }).catch((e) => console.error('❌ enqueue refund failed', e))
              processedRefunds.add(sigKey)
            }
            lobby.players.delete(wallet)
            socketToLobby.delete(socket.id)
            await removeLobbyPlayerRecord(lobby.id, wallet)
          }
        }
        socket.leave(lobby.id)
        await syncLobbyPlayerCountDb(lobby.id)
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

  // Room join for active match (clients provide matchSessionId)
  socket.on('join_match_room', (payload: { matchSessionId: string }) => {
    try {
      const matchId = String(payload?.matchSessionId || '')
      if (!matchId || !activeMatches.has(matchId)) return
      socket.join(matchId)
      socketToMatch.set(socket.id, matchId)
      const match = activeMatches.get(matchId)!
      // Minimal status snapshot
      socket.emit('gameStatusUpdate', {
        gameState: 'ACTIVE',
        players: (match.roster || []).map(r => ({
          id: r.wallet,
          position: { x: 0, y: 0, z: 0 },
          quaternion: { x: 0, y: 0, z: 0, w: 1 },
          username: r.username,
          status: 'In',
        })),
      })
    } catch {}
  })

  // Relay player kinematic state to other participants (basic authoritative echo)
  socket.on('playerStateUpdate', (data: { position: [number, number, number]; rotation: [number, number, number, number] }) => {
    try {
      const matchId = socketToMatch.get(socket.id)
      const wallet = (socket.data as any)?.wallet || ''
      if (!matchId || !wallet) return
      socket.to(matchId).emit('playerStateUpdate', {
        playerId: String(wallet).toLowerCase(),
        position: data.position,
        rotation: data.rotation,
      })
    } catch {}
  })

  socket.on('disconnect', async () => {
    // Remove player from any lobby
    for (const lobby of lobbies.values()) {
      let changed = false
      for (const [wallet, p] of lobby.players.entries()) {
        if (p.socketId === socket.id) {
          lobby.players.delete(wallet)
          changed = true
          await removeLobbyPlayerRecord(lobby.id, wallet)
        }
      }
      if (changed) {
        await syncLobbyPlayerCountDb(lobby.id)
        broadcastLobby(lobby)
      }
    }
    socketToLobby.delete(socket.id)
    socketToMatch.delete(socket.id)
  })
})

const PORT = process.env.PORT || 4001
app.get('/health', (_req, res) => res.json({ ok: true }))
server.listen(PORT, () => console.log(`[sumo-socket] listening on ${PORT}`))

const MATCH_TICK_INTERVAL_MS = 1000
setInterval(() => {
  for (const [matchId, match] of activeMatches.entries()) {
    const elapsedSeconds = Math.floor((Date.now() - (match.startedAt || Date.now())) / 1000)
    const roster = match.roster || []
    const payload: GameStatusUpdatePayloadPayload = {
      gameState: 'ACTIVE',
      countdown: null,
      message: `Elapsed ${elapsedSeconds}s`,
      players: roster.map((p) => ({
        id: p.wallet,
        username: p.username,
        status: 'In',
        position: { x: 0, y: 0, z: 0 },
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
      })),
    }
    io.to(matchId).emit('gameStatusUpdate', payload)
  }
}, MATCH_TICK_INTERVAL_MS)



