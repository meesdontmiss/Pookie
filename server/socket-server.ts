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
import pino from 'pino'

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

interface PlayerRuntimeState {
  position: [number, number, number]
  rotation: [number, number, number, number]
  status: 'In' | 'Out'
  updatedAt: number
}

const app = express()
const server = http.createServer(app)

// Use /api/socketio path to match working Cock Combat implementation
// This path works reliably with Render's WebSocket proxy
const SOCKET_IO_PATH = process.env.SOCKET_IO_PATH || '/api/socketio'

const io = new Server(server, {
  path: SOCKET_IO_PATH,
  addTrailingSlash: false,
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
  playerStates: Map<Wallet, PlayerRuntimeState>
  eliminated: Set<Wallet>
  finished?: boolean
}
const activeMatches = new Map<MatchId, ActiveMatch>()
const lastMatchByLobby = new Map<LobbyId, MatchId>()
const processedRefunds = new Set<string>() // track by txSignature to avoid duplicates
const socketToMatch = new Map<string, string>() // map socket.id -> matchId
const socketToLobby = new Map<string, LobbyId>()

// Lazy getter for Supabase to avoid loading env vars at module init time
function getSupabase() {
  return getSupabaseAdmin()
}
const TRACK_LOBBY_PRESENCE =
  process.env.TRACK_LOBBY_PRESENCE === 'true' ||
  process.env.SUPABASE_LOBBY_PERSIST === 'true'
const logger = pino({ name: 'sumo-socket', level: process.env.LOG_LEVEL || 'info' })
const MAX_PAYMENT_ATTEMPTS = 5
const MATCH_ELIMINATION_Y = -5

function fireAndForget<T>(promise: Promise<T>, context: string, meta?: Record<string, any>) {
  promise.catch((err) => logger.error({ err, context, ...meta }, 'Async task failed'))
}

if (!TRACK_LOBBY_PRESENCE) {
  logger.info('Supabase lobby presence tracking disabled')
}

async function ensureSeedLobbies() {
  try {
    const records = HARDCODED_LOBBIES.map((l) => ({
      id: l.id,
      name: l.name,
      wager_amount: l.wager,
      max_players: l.capacity,
      status: 'open',
    }))
    await getSupabase().from('lobbies').upsert(records, { onConflict: 'id' })
  } catch (error) {
    logger.error({ err: error }, 'Failed to seed lobbies')
  }
}

async function upsertLobbyPlayerRecord(lobbyId: LobbyId, player: PlayerState) {
  if (!TRACK_LOBBY_PRESENCE || player.isAi) return
  try {
    await getSupabase()
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
    await getSupabase()
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
    await getSupabase()
      .from('lobby_players')
      .update({ wager_amount: amount ?? null, wager_confirmed: confirmed })
      .eq('lobby_id', lobbyId)
      .eq('wallet_address', wallet)
  } catch (error) {
    console.error('[supabase] Failed to update wager state', { lobbyId, wallet, error })
  }
  if (txSignature) {
    try {
      await getSupabase()
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
  if (!TRACK_LOBBY_PRESENCE || wallet.startsWith('ai-')) return
  try {
    await getSupabase()
      .from('lobby_players')
      .delete()
      .eq('lobby_id', lobbyId)
      .eq('wallet_address', wallet)
  } catch (error) {
    console.error('[supabase] Failed to remove lobby player', { lobbyId, wallet, error })
  }
}

async function clearLobbyPlayersRecord(lobbyId: LobbyId) {
  if (!TRACK_LOBBY_PRESENCE) return
  try {
    await getSupabase()
      .from('lobby_players')
      .delete()
      .eq('lobby_id', lobbyId)
  } catch (error) {
    console.error('[supabase] Failed to clear lobby players', { lobbyId, error })
  }
}

async function syncLobbyPlayerCountDb(lobbyId: LobbyId) {
  if (!TRACK_LOBBY_PRESENCE) return
  try {
    const { count, error } = await getSupabase()
      .from('lobby_players')
      .select('id', { count: 'exact', head: true })
      .eq('lobby_id', lobbyId)
    if (error) throw error
    await getSupabase()
      .from('lobbies')
      .update({ current_players: count ?? 0 })
      .eq('id', lobbyId)
  } catch (error) {
    console.error('[supabase] Failed to sync lobby player count', { lobbyId, error })
  }
}

async function updateLobbyStatusDb(lobbyId: LobbyId, status: string) {
  try {
    await getSupabase()
      .from('lobbies')
      .update({ status })
      .eq('id', lobbyId)
    logger.info({ lobbyId, status }, 'Lobby status updated')
  } catch (error) {
    logger.error({ lobbyId, status, err: error }, 'Failed to update lobby status')
  }
}

ensureSeedLobbies().catch((error) => console.error('[supabase] Seed error', error))

async function resetLobbyPlayers() {
  if (!TRACK_LOBBY_PRESENCE) return
  try {
    await getSupabase()
      .from('lobby_players')
      .delete()
      .neq('lobby_id', '')
  } catch (error) {
    logger.error({ err: error }, 'Failed to reset lobby players')
  }
}

resetLobbyPlayers().catch((error) => console.error('[supabase] Reset players error', error))

async function recordMatchStart(matchId: MatchId, lobbyId: LobbyId, gameMode: string, seed: number, roster: Array<{ wallet: string; username: string; isAi?: boolean }>) {
  try {
    await getSupabase()
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
    logger.error({ matchId, lobbyId, err: error }, 'Failed to record match start')
  }
}

async function recordMatchResult(matchId: MatchId, status: 'completed' | 'cancelled', winnerWallet?: string) {
  try {
    await getSupabase()
      .from('match_state')
      .update({
        status,
        winner_wallet: winnerWallet ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', matchId)
  } catch (error) {
    logger.error({ matchId, status, winnerWallet, err: error }, 'Failed to record match result')
  }
}

/**
 * Refund helper for stale / cancelled matches:
 * For a given lobby, find all locked wagers in wager_events and enqueue refunds.
 * We recompute the escrow address per tx via getTransactionDetails + EscrowService.getAllWallets,
 * similar to the confirm_wager handler, so we don't need to have persisted escrow per match.
 */
async function refundLockedWagersForLobby(lobbyId: LobbyId, reason: string) {
  const supa = getSupabase()
  try {
    const { data: locked, error } = await supa
      .from('wager_events')
      .select('wallet_address, amount, tx_signature, status')
      .eq('lobby_id', lobbyId)
      .in('status', ['locked'])

    if (error) {
      logger.error({ lobbyId, err: error }, 'Failed to load locked wagers for lobby')
      return
    }
    if (!locked || locked.length === 0) return

    const { walletA, walletB } = await EscrowService.getAllWallets()
    const escrowCandidates = new Set([walletA, walletB].filter(Boolean))

    for (const row of locked) {
      const wallet = String(row.wallet_address || '')
      const signature = String(row.tx_signature || '')
      const amountSol = Number(row.amount || 0)
      if (!wallet || !signature || amountSol <= 0) continue

      try {
        const tx = await getTransactionDetails(signature)
        if (!tx || !tx.meta || !tx.transaction) {
          logger.warn({ lobbyId, wallet, signature }, 'Stale wager tx not found; skipping refund enqueue')
          continue
        }
        const keys = tx.transaction.message.accountKeys.map((k: any) =>
          typeof k === 'string' ? k : k.pubkey?.toString?.() || String(k),
        )
        const pre = tx.meta.preBalances
        const post = tx.meta.postBalances

        const playerIndex = keys.findIndex((k: string) => k === wallet)
        const escrowIndex = keys.findIndex((k: string) => escrowCandidates.has(k))

        if (playerIndex === -1 || escrowIndex === -1) {
          logger.warn(
            { lobbyId, wallet, signature },
            'Stale wager tx participants mismatch; skipping refund enqueue',
          )
          continue
        }

        const escrowDelta = post[escrowIndex] - pre[escrowIndex]
        const expectedLamports = solToLamports(amountSol)
        if (escrowDelta !== expectedLamports) {
          logger.warn(
            { lobbyId, wallet, signature, escrowDelta, expectedLamports },
            'Stale wager amount mismatch; skipping refund enqueue',
          )
          continue
        }

        const escrowPublicKey = keys[escrowIndex]

        // Enqueue idempotent refund job keyed by original tx signature.
        await enqueuePaymentJob('refund', {
          escrowPublicKey,
          playerPublicKey: wallet,
          amountSol,
          txSignatureKey: signature,
          description: reason,
        })
        logger.info(
          { lobbyId, wallet, amountSol, signature },
          'Refund job enqueued for stale match',
        )
      } catch (err: any) {
        logger.error(
          { lobbyId, wallet, signature, err },
          'Failed to enqueue refund for stale wager',
        )
      }
    }
  } catch (outerErr) {
    logger.error({ lobbyId, err: outerErr }, 'refundLockedWagersForLobby failed')
  }
}

/**
 * Periodically scan match_state for matches stuck in 'active' for too long.
 * For such stale matches, mark them cancelled and enqueue refunds for all locked wagers in that lobby.
 * This covers server restarts or crashes that occur mid-match before a winner is recorded.
 */
async function reconcileStaleMatchesOnce() {
  const supa = getSupabase()
  // Allow tuning via env; default 20 minutes.
  const timeoutMinutes = Number(process.env.STALE_MATCH_TIMEOUT_MINUTES ?? '20')
  const now = Date.now()
  const cutoffIso = new Date(now - timeoutMinutes * 60 * 1000).toISOString()

  try {
    const { data: rows, error } = await supa
      .from('match_state')
      .select('id,lobby_id,status,started_at')
      .eq('status', 'active')
      .lt('started_at', cutoffIso)
      .limit(50)

    if (error) {
      logger.error({ err: error }, 'Failed to query stale matches')
      return
    }
    if (!rows || rows.length === 0) return

    for (const row of rows) {
      const matchId = String(row.id)
      const lobbyId = String(row.lobby_id)
      logger.warn(
        { matchId, lobbyId, started_at: row.started_at, timeoutMinutes },
        'Found stale active match; cancelling and refunding',
      )
      await refundLockedWagersForLobby(
        lobbyId,
        'Auto-refund: match timeout or server restart',
      )
      await recordMatchResult(matchId as MatchId, 'cancelled', undefined)
    }
  } catch (err) {
    logger.error({ err }, 'reconcileStaleMatchesOnce failed')
  }
}

function getAlivePlayers(match: ActiveMatch) {
  const roster = match.roster ?? []
  return roster.filter((p) => !match.eliminated.has(p.wallet))
}

async function enqueuePayoutsForMatch(match: ActiveMatch, winnerWallet: string | undefined) {
  if (!winnerWallet) return
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
      winnerPublicKey: winnerWallet,
      totalPotSol: pot,
      adminWalletPublicKey: admin,
      houseCutPercentage: housePct,
      matchId: match.id,
    }).catch((e) => console.error('❌ enqueue payout failed', e))
  }
}

async function finishMatch(matchId: MatchId, winnerWallet?: string) {
  const match = activeMatches.get(matchId)
  if (!match || match.finished) return
  match.finished = true
  activeMatches.delete(matchId)
  if (winnerWallet) {
    await enqueuePayoutsForMatch(match, winnerWallet)
    await recordMatchResult(matchId, 'completed', winnerWallet)
    metrics.matchesFinished += 1
    logger.info({ matchId, winnerWallet }, 'Match finished')
  } else {
    await recordMatchResult(matchId, 'cancelled', undefined)
    metrics.matchesFinished += 1
    logger.info({ matchId }, 'Match cancelled')
  }
  io.to(matchId).emit('match_finished', { matchId, winner: winnerWallet ?? null })
}

function handlePlayerStateUpdate(matchId: MatchId, wallet: Wallet, position: [number, number, number], rotation: [number, number, number, number]) {
  const match = activeMatches.get(matchId)
  if (!match) return
  const existing = match.playerStates.get(wallet) || {
    position: [0, 0, 0] as [number, number, number],
    rotation: [0, 0, 0, 1] as [number, number, number, number],
    status: 'In' as const,
    updatedAt: 0,
  }
  existing.position = position
  existing.rotation = rotation
  existing.updatedAt = Date.now()
  match.playerStates.set(wallet, existing)

  if (existing.status === 'In' && position[1] < MATCH_ELIMINATION_Y) {
    existing.status = 'Out'
    match.eliminated.add(wallet)
    io.to(matchId).emit('player_eliminated', { matchId, playerId: wallet })
      metrics.playerEliminations += 1
      logger.info({ matchId, playerId: wallet }, 'Player eliminated')
    const alive = getAlivePlayers(match).filter((p) => !match.eliminated.has(p.wallet))
    if (alive.length <= 1) {
      const winner = alive[0]?.wallet
      void finishMatch(matchId, winner)
    }
  }
}

async function insertTransactionRecord(wallet: string | null, type: string, amount: number, relatedId: string | null, description: string | null, txSignature: string | null) {
  try {
    await getSupabase()
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
    logger.error({ wallet, type, amount, relatedId, err: error }, 'Failed to insert transaction')
  }
}

async function updateWagerEventStatus(txSignature: string, status: string) {
  try {
    await getSupabase()
      .from('wager_events')
      .update({ status })
      .eq('tx_signature', txSignature)
  } catch (error) {
    console.error('[supabase] Failed to update wager event status', { txSignature, status, error })
  }
}

async function enqueuePaymentJob(jobType: 'payout' | 'refund', payload: Record<string, any>) {
  const supa = getSupabase()

  // Best-effort idempotency: use an explicit key when provided,
  // otherwise derive a stable key for common cases (matchId or txSignatureKey).
  let idempotencyKey: string | null = null
  if (typeof payload.idempotencyKey === 'string') {
    idempotencyKey = payload.idempotencyKey
  } else if (typeof payload.txSignatureKey === 'string') {
    idempotencyKey = `${jobType}:tx:${payload.txSignatureKey}`
  } else if (jobType === 'payout' && typeof payload.matchId === 'string' && typeof payload.escrowPublicKey === 'string') {
    idempotencyKey = `${jobType}:match:${payload.matchId}:escrow:${payload.escrowPublicKey}`
  }

  if (idempotencyKey) {
    // Attach the key into payload for future queries
    const keyedPayload = { ...payload, idempotencyKey }

    // Check if a job for this key already exists (any status)
    try {
      const { data: existing, error: selectError } = await supa
        .from('payment_jobs')
        .select('id, status, attempts')
        .eq('job_type', jobType)
        .contains('payload', { idempotencyKey })
        .limit(1)

      if (!selectError && existing && existing.length > 0) {
        // Reuse existing job id; processor will handle retries if needed
        return existing[0].id as string
      }
    } catch (error) {
      console.error('[payment_jobs] idempotency check failed', { jobType, idempotencyKey, error })
      // fall through to insert – worst case we create a duplicate job, but
      // on-chain idempotency (same tx sig) still protects from double-spend
    }

    const { data, error } = await supa
      .from('payment_jobs')
      .insert({ job_type: jobType, payload: keyedPayload })
      .select('id')
      .single()
    if (error) throw error
    return data.id as string
  }

  // No idempotency key available – insert a simple best-effort job
  const { data, error } = await supa
    .from('payment_jobs')
    .insert({ job_type: jobType, payload })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

async function claimPendingJobs(limit = 5) {
  const { data, error } = await getSupabase()
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
  const { data, error } = await getSupabase()
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
  const { error } = await getSupabase()
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
        metrics.paymentJobsCompleted += 1
        logger.info({ jobId: job.id, type: job.job_type }, 'Payment job completed')
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
        metrics.paymentJobsCompleted += 1
        logger.info({ jobId: job.id, type: job.job_type }, 'Payment job completed')
      } else {
        throw new Error(`Unknown job type: ${job.job_type}`)
      }
    } catch (error: any) {
      console.error('[payment-job] Failed', { id: job.id, error })
      const lastError = error?.message || String(error)
      await finalizeJob(job.id, attempts >= MAX_PAYMENT_ATTEMPTS ? 'failed' : 'pending', attempts, lastError)
      if (attempts >= MAX_PAYMENT_ATTEMPTS) {
        metrics.paymentJobsFailed += 1
        logger.error({ jobId: job.id, type: job.job_type, lastError }, 'Payment job permanently failed')
      }
    }
  }
}

setInterval(() => {
  processPaymentJobsOnce().catch((error) => console.error('[payment-jobs] loop error', error))
}, 3000)

// Periodically reconcile stale matches that never finished cleanly (e.g., server crash mid-match)
setInterval(() => {
  reconcileStaleMatchesOnce().catch((error) =>
    console.error('[stale-matches] reconcile loop error', error),
  )
}, (Number(process.env.STALE_MATCH_RECONCILE_INTERVAL_MS ?? '60000') || 60000))


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
  fireAndForget(updateLobbyStatusDb(lobby.id, 'open'), 'updateLobbyStatusDb', { lobbyId: lobby.id, status: 'open' })
}

function tryStartCountdown(lobby: LobbyState) {
  if (lobby.countdown !== null) return
  const players = Array.from(lobby.players.values())
  if (players.length === 0) return

  const readyCount = players.filter((p) => p.ready).length
  const majority = Math.ceil(players.length / 2)
  const allWagered = lobby.wager === 0 ? true : players.every((p) => p.wagerLocked)

  // Free lobbies: if at least one human is ready but there are still
  // empty slots, defer starting the countdown. The existing aiFillTimer
  // + fillAiPlayers(lobby) logic (triggered from set_ready) will first
  // populate AI players, broadcast them into the lobby UI, and then call
  // tryStartCountdown again. At that point, players.length will be at
  // or near capacity and we allow the normal majority/allWagered check
  // to start the 5-second countdown.
  if (lobby.wager === 0) {
    const humansReady = players.filter((p) => !p.isAi && p.ready).length
    const hasEmptySlots = players.length < lobby.capacity
    if (humansReady >= 1 && hasEmptySlots) {
      return
    }
  }

  if (readyCount >= majority && allWagered) {
    lobby.countdown = 5
    broadcastLobby(lobby)
    fireAndForget(updateLobbyStatusDb(lobby.id, 'countdown'), 'updateLobbyStatusDb', { lobbyId: lobby.id, status: 'countdown' })
    lobby.countdownTimer = setInterval(() => {
      // Auto-kick unready/unwagered during countdown (refund paid-but-unready)
      for (const [wallet, p] of lobby.players.entries()) {
        // For paid lobbies, check both ready and wagerLocked; for free lobbies, only check ready
        const shouldKick = lobby.wager === 0 ? !p.ready : (!p.ready || !p.wagerLocked)
        if (shouldKick) {
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
            metrics.refundsQueued += 1
            logger.info({ lobbyId: lobby.id, wallet, amount: p.wagerAmountSol }, 'Refund queued (countdown kick)')
            }
          }
          lobby.players.delete(wallet)
          fireAndForget(removeLobbyPlayerRecord(lobby.id, wallet), 'removeLobbyPlayerRecord', { lobbyId: lobby.id, wallet })
        }
      }
      fireAndForget(syncLobbyPlayerCountDb(lobby.id), 'syncLobbyPlayerCountDb', { lobbyId: lobby.id })
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
  snapshot.playerStates = new Map<Wallet, PlayerRuntimeState>()
  snapshot.eliminated = new Set<Wallet>()
  const platformRadius = 20
  const platformHeight = 4
  const roster = snapshot.roster ?? []
  for (let i = 0; i < roster.length; i++) {
    const entry = roster[i]
    // Spawn players in a circle around the platform edge, facing inward
    const angle = (i / roster.length) * Math.PI * 2
    const spawnRadius = platformRadius * 0.6
    const x = Math.cos(angle) * spawnRadius
    const z = Math.sin(angle) * spawnRadius
    const y = platformHeight / 2 + 1.2
    snapshot.playerStates.set(entry.wallet, {
      position: [x, y, z],
      rotation: [0, 0, 0, 1],
      status: 'In',
      updatedAt: Date.now(),
    })
  }
  activeMatches.set(matchId, snapshot)
  lastMatchByLobby.set(lobby.id, matchId)
  const gameMode = HARDCODED_LOBBIES.find((h) => h.id === lobby.id)?.gameMode ?? 'SMALL_SUMO'
  metrics.matchesStarted += 1
  logger.info({ lobbyId: lobby.id, matchId, seed, gameMode }, 'Match started')
  fireAndForget(recordMatchStart(matchId, lobby.id, gameMode, seed, snapshot.roster ?? []), 'recordMatchStart', { lobbyId: lobby.id, matchId })

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
  fireAndForget(clearLobbyPlayersRecord(lobby.id), 'clearLobbyPlayersRecord', { lobbyId: lobby.id })
  fireAndForget(syncLobbyPlayerCountDb(lobby.id), 'syncLobbyPlayerCountDb', { lobbyId: lobby.id })
  clearCountdown(lobby)
  broadcastLobby(lobby)
  fireAndForget(updateLobbyStatusDb(lobby.id, 'in_match'), 'updateLobbyStatusDb', { lobbyId: lobby.id, status: 'in_match' })
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
        await socket.join(lobby.id)
        // For free lobbies, auto-lock wager (no wager needed)
        const playerState: PlayerState = { 
          socketId: socket.id, 
          wallet: data.wallet, 
          username: data.username, 
          ready: false, 
          wagerLocked: lobby.wager === 0 // Auto-lock for free lobbies
        }
        lobby.players.set(data.wallet, playerState)
        socketToLobby.set(socket.id, lobby.id)
        ;(socket.data as any).wallet = data.wallet
        broadcastLobby(lobby)
        fireAndForget(upsertLobbyPlayerRecord(lobby.id, playerState), 'upsertLobbyPlayerRecord', { lobbyId: lobby.id, wallet: data.wallet })
        fireAndForget(syncLobbyPlayerCountDb(lobby.id), 'syncLobbyPlayerCountDb', { lobbyId: lobby.id })
        metrics.lobbyJoins += 1
        logger.info({ lobbyId: lobby.id, wallet: data.wallet, wagerLocked: playerState.wagerLocked }, 'Player joined lobby')
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

            logger.info({ lobbyId: lobby.id, wallet: player.wallet, escrow: keys[escrowIndex], wager: lobby.wager }, 'Wager verified')

            broadcastLobby(lobby)
            fireAndForget(updateLobbyPlayerWager(lobby.id, player.wallet, lobby.wager, true, signature), 'updateLobbyPlayerWager', { lobbyId: lobby.id, wallet: player.wallet })
            metrics.wagersLocked += 1
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
        fireAndForget(updateLobbyPlayerReady(lobby.id, player.wallet, player.ready), 'updateLobbyPlayerReady', { lobbyId: lobby.id, wallet: player.wallet, ready: player.ready })
        logger.info({ lobbyId: lobby.id, wallet: player.wallet, ready: player.ready }, 'Player ready state')
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

        void finishMatch(matchId, winner).catch((e) => {
          console.error('❌ Admin finish match failed:', e)
          socket.emit('message', { type: 'error', message: 'Payout enqueue failed', code: 'ERR_PAYOUT' } as ServerToClient)
        })
      }
      if (data.type === 'match_result') {
        // Game client reports winner at end of match
        const matchId = (data as any).matchId as string | undefined
        const winner = (data as any).winnerWallet as string | undefined
        if (!matchId || !winner) return
        void finishMatch(matchId, winner).catch((e) => console.error('❌ Auto finish match failed:', e))
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
              metrics.refundsQueued += 1
              logger.info({ lobbyId: lobby.id, wallet, amount: p.wagerAmountSol }, 'Refund queued (player left)')
            }
            lobby.players.delete(wallet)
            socketToLobby.delete(socket.id)
            fireAndForget(removeLobbyPlayerRecord(lobby.id, wallet), 'removeLobbyPlayerRecord', { lobbyId: lobby.id, wallet })
          }
        }
        await socket.leave(lobby.id)
        fireAndForget(syncLobbyPlayerCountDb(lobby.id), 'syncLobbyPlayerCountDb', { lobbyId: lobby.id })
        broadcastLobby(lobby)
        metrics.lobbyLeaves += 1
        logger.info({ lobbyId: lobby.id, socketId: socket.id }, 'Player left lobby')
      }
      if (data.type === 'reconnect') {
        const lobby = lobbies.get(data.lobbyId); if (!lobby) return
        await socket.join(lobby.id)
        broadcastLobby(lobby)
      }
    } catch (e) {
      socket.emit('message', { type: 'error', message: (e as Error).message, code: 'ERR_INTERNAL' } as ServerToClient)
    }
  })

  // Room join for active match (clients provide matchSessionId)
  socket.on('join_match_room', async (payload: { matchSessionId: string }) => {
    try {
      const matchId = String(payload?.matchSessionId || '')
      if (!matchId || !activeMatches.has(matchId)) return
      await socket.join(matchId)
      socketToMatch.set(socket.id, matchId)
      const match = activeMatches.get(matchId)!
      // Send current player states with actual positions
      socket.emit('gameStatusUpdate', {
        gameState: 'ACTIVE',
        players: (match.roster || []).map(r => {
          const state = match.playerStates.get(r.wallet)
          return {
            id: r.wallet,
            position: state ? { x: state.position[0], y: state.position[1], z: state.position[2] } : { x: 0, y: 5, z: 0 },
            quaternion: state ? { x: state.rotation[0], y: state.rotation[1], z: state.rotation[2], w: state.rotation[3] } : { x: 0, y: 0, z: 0, w: 1 },
            username: r.username,
            status: state?.status || 'In',
          }
        }),
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
      handlePlayerStateUpdate(matchId, String(wallet), data.position, data.rotation)
    } catch {}
  })

  socket.on('disconnect', () => {
    // Remove player from any lobby
    for (const lobby of lobbies.values()) {
      let changed = false
      for (const [wallet, p] of lobby.players.entries()) {
        if (p.socketId === socket.id) {
          lobby.players.delete(wallet)
          changed = true
          fireAndForget(removeLobbyPlayerRecord(lobby.id, wallet), 'removeLobbyPlayerRecord', { lobbyId: lobby.id, wallet })
        }
      }
      if (changed) {
        fireAndForget(syncLobbyPlayerCountDb(lobby.id), 'syncLobbyPlayerCountDb', { lobbyId: lobby.id })
        broadcastLobby(lobby)
        metrics.lobbyLeaves += 1
        logger.info({ lobbyId: lobby.id }, 'Player disconnected from lobby')
      }
    }
    socketToLobby.delete(socket.id)
    socketToMatch.delete(socket.id)
  })
})

const metrics = {
  lobbyJoins: 0,
  lobbyLeaves: 0,
  wagersLocked: 0,
  refundsQueued: 0,
  payoutsQueued: 0,
  matchesStarted: 0,
  matchesFinished: 0,
  playerEliminations: 0,
  paymentJobsCompleted: 0,
  paymentJobsFailed: 0,
}

const PORT = process.env.PORT || 4001
app.get('/health', (_req, res) => res.json({ ok: true, metrics }))
server.listen(PORT, () => logger.info({ port: PORT }, 'sumo socket listening'))

// AI movement logic
function updateAIPlayers(match: MatchState) {
  const platformRadius = 20
  const platformHeight = 4
  const aiPlayers = (match.roster || []).filter((r) => r.isAi)
  
  for (const aiPlayer of aiPlayers) {
    const state = match.playerStates.get(aiPlayer.wallet)
    if (!state || state.status !== 'In') continue
    
    const [x, y, z] = state.position
    const distanceFromCenter = Math.sqrt(x * x + z * z)
    
    // If AI is too close to edge, move toward center
    if (distanceFromCenter > platformRadius * 0.7) {
      const angleToCenter = Math.atan2(-z, -x)
      state.position[0] += Math.cos(angleToCenter) * 0.15
      state.position[2] += Math.sin(angleToCenter) * 0.15
    } else {
      // Random walk with slight bias toward center
      const randomAngle = Math.random() * Math.PI * 2
      const moveSpeed = 0.08 + Math.random() * 0.04
      state.position[0] += Math.cos(randomAngle) * moveSpeed
      state.position[2] += Math.sin(randomAngle) * moveSpeed
      
      // Slight pull toward center to prevent edge camping
      const pullStrength = 0.02
      state.position[0] -= x * pullStrength
      state.position[2] -= z * pullStrength
    }
    
    // Keep Y at platform level
    state.position[1] = platformHeight / 2 + 1.2
    state.updatedAt = Date.now()
  }
}

const MATCH_TICK_INTERVAL_MS = 1000
setInterval(() => {
  for (const [matchId, match] of activeMatches.entries()) {
    // Update AI positions
    updateAIPlayers(match)
    
    const elapsedSeconds = Math.floor((Date.now() - (match.startedAt || Date.now())) / 1000)
    const playersPayload = Array.from(match.playerStates.entries()).map(([id, state]) => ({
      id,
      username: match.roster?.find((p) => p.wallet === id)?.username || id,
      status: state.status,
      position: { x: state.position[0], y: state.position[1], z: state.position[2] },
      quaternion: { x: state.rotation[0], y: state.rotation[1], z: state.rotation[2], w: state.rotation[3] },
    }))
    const payload: GameStatusUpdatePayloadPayload = {
      gameState: match.finished ? 'GAME_OVER' : 'ACTIVE',
      countdown: null,
      message: `Elapsed ${elapsedSeconds}s`,
      players: playersPayload,
    }
    io.to(matchId).emit('gameStatusUpdate', payload)
  }
}, MATCH_TICK_INTERVAL_MS)



