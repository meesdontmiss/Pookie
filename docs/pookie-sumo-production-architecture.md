## Pookie Sumo Ball – Production Architecture (Authoritative Build)

This document describes the current production-ready implementation of Pookie Sumo Ball across client, server, Supabase, and Solana, based on the code in this repo.

---

## 1. High-Level Lifecycle

**Flow:**  
Lobby Browser → Lobby Panel (socket) → Wager (Solana) → Ready + Countdown → Match Start (authoritative) → Game Scene (3D arena) → Winner → Payout/Refund → Return to Lobbies.

Key systems:
- **Client lobby UI:** `app/pookiesumoroyale/lobby-browser/page.tsx`, `components/lobby/lobby-panel.tsx`
- **Authoritative lobby & match server:** `server/socket-server.ts` (Socket.IO + Supabase + Solana services)
- **Game client:** `app/pookiesumoroyale/game/[gameId]/page.tsx`, `components/plug-penguin/minigames/pookie-sumo-royale/royale-game-scene.tsx`, `SumoArenaScene.tsx`
- **Supabase schema:** `supabase/migrations/**/*.sql`, `db/sumo_schema.sql`
- **Solana services:** `lib/solana-utils.ts`, `lib/escrow-service.ts`, `lib/payout-service.ts`, `lib/refund-service.ts`
- **Wager API:** `app/api/wager/route.ts`

---

## 2. Lobby System (House-Hosted Only)

### 2.1 Hardcoded lobbies

- Defined in `shared/hardcoded-lobbies.ts`  
  - Fields: `id`, `name`, `gameMode`, `capacity`, `wager` (SOL), `description`, `art`.
- Synced into Supabase `lobbies` table by:
  - `db/sumo_schema.sql` (escrow/metrics)
  - `supabase/migrations/002_lobbies.sql` (HTTP/admin tooling)
  - `ensureSeedLobbies()` in `server/socket-server.ts` keeps `lobbies` rows consistent with `HARDCODED_LOBBIES`.

### 2.2 Client lobby browser

- `app/pookiesumoroyale/lobby-browser/page.tsx`
  - Renders glassmorphic lobby cards sorted by wager, with **live player counts** (via `useLobbyCounts`).
  - Clicking a lobby opens `LobbyPanel` inline (no route change) for one-click ready/wager flow.
- `hooks/use-lobby-counts.ts`
  - Connects to socket server (`NEXT_PUBLIC_SOCKET_URL`) and listens for:
    - `lobby_counts` (per-lobby delta)
    - `lobby_counts_snapshot` (full map)
  - Drives "X LIVE" badges on lobby cards.

### 2.3 Lobby room (authoritative socket)

- `components/lobby/lobby-panel.tsx`
  - Uses `useLobbySocket(lobby.id, username, walletAddress, isPractice)` for real-time roster & ready state.
  - Uses `useWager()` to talk to `/api/wager` and then `confirm_wager` via socket once on-chain tx is confirmed.
  - Enforces:
    - In paid lobbies: cannot ready without a confirmed wager.
    - Local UI mirrors **server-authoritative** state (ready + wager flags).
  - Provides:
    - Countdown overlay on `lobby_state.countdown`.
    - "ALL PLAYERS READY" banner when majority-ready conditions met.
    - Admin-only manual `adminEndMatch` shortcut to force payouts (guarded by admin wallet).

### 2.4 Guest identities

- `hooks/use-guest-identity.ts`
  - Generates stable `guest_<uuid>` once per browser, stored in `localStorage` and `window.__guestId`.
  - Used as `wallet` identity when no real wallet is connected, for free/practice lobbies.
- `useLobbySocket` + `useLobbyCounts`:
  - Always register an identity (`register_identity`) on connect using either wallet or guest ID.

---

## 3. Socket Server (Render) – Authoritative Lobby + Match

**File:** `server/socket-server.ts`

### 3.1 Core responsibilities

- House-only lobbies in memory, synced from `HARDCODED_LOBBIES`.
- Tracks for each lobby:
  - `players: Map<wallet, PlayerState>`
  - `capacity`, `wager`, `countdown` timer, optional AI-fill timer.
- Emits/handles messages:
  - `ClientToServer` (`shared/contracts.ts`):
    - `join_lobby`, `confirm_wager`, `set_ready`, `leave_lobby`, `reconnect`,
    - plus extended types `admin_end_match`, `match_result`.
  - `ServerToClient` (`shared/contracts.ts`):
    - `lobby_state`, `error`, `kicked`, `match_start`.

### 3.2 Lobby join/leave & readiness

- **Join:**
  - Validates lobby exists and capacity not exceeded.
  - Adds/overwrites `PlayerState` `{ socketId, wallet, username, ready=false, wagerLocked=false }`.
  - Joins socket room = `lobby.id`.
  - Persists into `lobby_players` (`supabase/migrations/002_lobbies.sql`) via `upsertLobbyPlayerRecord`.
  - Broadcasts `lobby_state` to room.

- **Set ready:**
  - Paid lobbies: requires `wagerLocked === true` before allowing `ready=true`.
  - Updates `PlayerState.ready`, updates `lobby_players.is_ready`, re-broadcasts.
  - For **free lobbies**, schedules an AI-fill timer if:
    - At least one human ready,
    - Total players < capacity.

- **Leave / disconnect:**
  - For `leave_lobby` before countdown: if paid and `wagerLocked`, enqueues **refund** job and prunes player from map and `lobby_players`.
  - On `disconnect`:
    - Removes any `PlayerState` whose `socketId` matches.
    - Syncs `lobby_players` + `lobbies.current_players`.
    - Broadcasts updated `lobby_state`.
  - During countdown: unready/unwagered players auto-kicked (optionally refunded if they had paid).

### 3.3 Countdown and auto-kick logic

- `tryStartCountdown(lobby)`:
  - Computes:
    - `readyCount`, `majority = ceil(players.length / 2)`,
    - `allWagered = (wager === 0) || everyone.wagerLocked`.
  - If `readyCount >= majority && allWagered`:
    - Starts a **5-second countdown** (`lobby.countdown = 5`).
    - Sets `status='countdown'` in `lobbies`.
    - Every second:
      - Kicks any player who is either not ready or not fully wager-locked.
        - For paid lobbies, queued refunds via `payment_jobs` (see §5).
      - If lobby empty → reset `countdown` and status to `open`.
      - When countdown hits `0` → calls `startMatch(lobby)`.

### 3.4 Match start & active match registry

- `startMatch(lobby)`:
  - Generates `matchId = uuid`, `seed = randomInt(...)`, `gameMode` from `HARDCODED_LOBBIES`.
  - Builds `ActiveMatch` snapshot:
    - `players`: only those with `wagerLocked` and `escrowAddress`,
    - `roster`: `{ wallet, username, isAi }[]`,
    - Per-player runtime state map with initial transform.
  - Saves to:
    - In-memory `activeMatches`, `lastMatchByLobby`.
    - Supabase `match_state` (`supabase/migrations/008_match_state.sql`) with `status='active'`.
  - Emits `ServerToClient.match_start`:
    - Payload = `GameStartPacket` from `shared/contracts.ts`:
      - `matchId`, `seed`, `players[]`, `wagerAmount`, `gameMode`, `serverTimestamp`.
  - Clears lobby players (lobby becomes "in_match") and updates Supabase `lobbies.status='in_match'`.

### 3.5 Game loop & elimination (authoritative)

- Clients for the match **join a separate room**:
  - `join_match_room({ matchSessionId })`:
    - Maps socket to `matchId`, adds socket to room = `matchId`.
    - Sends initial `gameStatusUpdate` with `gameState='ACTIVE'` and per-player status.
- `playerStateUpdate` (from SumoArenaScene):
  - Relays latest kinematic state to other clients in the same match room.
  - Updates `ActiveMatch.playerStates`.
  - If a player's `position.y < MATCH_ELIMINATION_Y`:
    - Marks them `status='Out'`, adds to `eliminated` set, emits `player_eliminated`.
    - When only one `alive` player remains → calls `finishMatch(matchId, winnerWallet)`.

- Periodic **match tick** every second (`MATCH_TICK_INTERVAL_MS`):
  - Iterates `activeMatches`, computes `elapsedSeconds`.
  - For each match emits `gameStatusUpdate` into `matchId` room:
    - `gameState`: `'ACTIVE'` or `'GAME_OVER'`,
    - `players`: authoritative copy of positions/quaternions/status,
    - `message`: `"Elapsed Xs"`.

### 3.6 Match end & payout/refund enqueue

- `finishMatch(matchId, winnerWallet?)`:
  - Marks match as finished, removes from `activeMatches`.
  - With a winner:
    - Groups players by `escrowAddress` and builds pot for each escrow.
    - Enqueues **payout** jobs in `payment_jobs` (see §5).
    - Updates `match_state` with `status='completed'` + `winner_wallet`.
  - Without winner:
    - Marks `match_state.status='cancelled'`.
  - Emits `match_finished` to match room.

---

## 4. Game Client – 3D Simulation + Sync

### 4.1 Entry point & routing

- `useLobbySocket`:
  - On `match_start`, now correctly reads `payload.matchId` and navigates to:
    - `/pookiesumoroyale/game/${matchId}?practice=${isPractice}`.
- `app/pookiesumoroyale/game/[gameId]/page.tsx`:
  - `gameId` is the authoritative `matchId`.
  - Enforces wallet if `isPractice=false`, but allows guest for `practice=true`.
  - Renders `RoyaleGameScene lobbyId={gameId} isPractice={isPractice}`.

### 4.2 RoyaleGameScene – match socket + Sumo arena bridge

**File:** `components/plug-penguin/minigames/pookie-sumo-royale/royale-game-scene.tsx`

- On mount:
  - Guards: invalid `lobbyId` or missing wallet for non-practice → show error and exit.
  - Fetches lightweight static details (mode/map) for UI.
  - Connects a **match socket**:
    - URL/path = `NEXT_PUBLIC_SOCKET_URL` / `NEXT_PUBLIC_SOCKET_PATH`.
    - Registers identity (wallet or guest) with `register_identity`.
    - Emits `join_match_room({ matchSessionId: lobbyId })` where `lobbyId === matchId`.
  - Provides:
    - `socket`, `localUsername`, `lobbyId` (matchId), `isPractice`, `playerWalletAddress` to `SumoArenaScene`.
  - Handles `onMatchComplete` from arena to navigate back to lobby browser.

### 4.3 SumoArenaScene – physics, controls, and sync

**File:** `components/plug-penguin/minigames/pookie-sumo-royale/SumoArenaScene.tsx`

Key responsibilities:
- Client-side movement/physics via Rapier and React Three Fiber.
- Local player:
  - Uses keyboard mapping (`Controls` enum) for forward/back/strafe/jump/push.
  - Applies impulses & torques in local physics sim.
  - Emits throttled `playerStateUpdate` (~10 Hz) to server with position & rotation.
- Remote players:
  - `OtherPlayer` component receives target position/quaternion from server via `gameStatusUpdate`.
  - Smooth interpolation (lerp/slerp) for visual consistency, while collisions use Rapier's kinematic bodies.
- Elimination:
  - Local check for falling below Y-threshold triggers `onFallenOff`, while authoritative elimination is driven by server’s `handlePlayerStateUpdate`.
- HUD & Spectator:
  - `GameHUD` shows alive/out players and supports spectate-next/prev controls.
  - `SpectatorCameraHandler` snaps camera to chosen remote player and lerps to maintain cinematic follow.
- Game state:
  - `internalGameState: GameState` (WAITING, STARTING_COUNTDOWN, ACTIVE, ROUND_OVER, GAME_OVER).
  - Updated exclusively by:
    - Parent prop (`initialGameStateFromParent`) for initial WAITING/ACTIVE state, and
    - Socket `gameStatusUpdate` from server.
  - `GameStatusUI` reflects state & winner info and calls `onMatchComplete` when the game is over.

Result: server is **authoritative**, while the client does local interpolation and prediction purely for rendering, not for deciding outcomes or payouts.

---

## 5. Supabase Schema & Job Queue

### 5.1 Core tables

- `lobbies` / `lobby_players` (`supabase/migrations/002_lobbies.sql`)
  - HTTP/admin and analytics of lobby roster; kept in sync by socket server.

- `wager_events` (`supabase/migrations/006_wager_events.sql`)
  - Row per on-chain wager tx: `lobby_id`, `wallet_address`, `amount`, `tx_signature`, `status`.
  - Status transitions used:
    - `submitted` → on initial record,
    - `locked` → once server confirms on-chain funds to escrow,
    - `refunded` → via `updateWagerEventStatus` if refund job succeeds.

- `match_state` (`supabase/migrations/008_match_state.sql`)
  - Authoritative record per active/finished match:
    - `id`, `lobby_id`, `game_mode`, `seed`, `roster`, `status`, `winner_wallet`, `started_at`, `completed_at`.
  - Used for debugging, analytics, and cross-checking payouts.

- `transactions` (`supabase/migrations/001_pookie_economy.sql`)
  - Generic ledger:
    - `transaction_type`: `'wager' | 'win' | 'refund' | 'house_cut'`.
    - In this build, `insertTransactionRecord` logs:
      - Match payouts (`win`, `house_cut`),
      - Refunds (`refund`).

- `escrow_state` (`db/sumo_schema.sql` & `001_pookie_economy.sql`)
  - Single row with:
    - `active_wallet: 'A' | 'B'`,
    - `wallet_a`, `wallet_b`.
  - Managed through `EscrowService` (Supabase service client).

- `payment_jobs` (`supabase/migrations/009_payment_jobs.sql`)
  - Durable job queue:
    - `job_type`: `'payout' | 'refund'`,
    - `payload`: JSON with Solana params,
    - `status`: `pending | processing | completed | failed`,
    - `attempts`, `last_error`, `processed_at`.

### 5.2 Payment job processing

- `enqueuePaymentJob(jobType, payload)`:
  - Inserts a row into `payment_jobs` and returns `id`.
- Background worker in `server/socket-server.ts`:
  - `processPaymentJobsOnce()` called every 3 seconds:
    - Claims jobs in `pending` / `failed` with `attempts < MAX_PAYMENT_ATTEMPTS`.
    - Mark job as `processing` with optimistic concurrency (`where status=currentStatus`).
    - For each:
      - **payout:**
        - Calls `payoutFromEscrow` (see §6) to send two SOL transfers atomically.
        - Logs `transactions` rows for `win` & `house_cut`.
        - Updates `match_state` → `completed` with `winner_wallet`.
      - **refund:**
        - Calls `refundFromEscrow`.
        - Inserts `transactions` row of type `refund`.
        - Updates `wager_events.status='refunded'`.
    - On success → `status='completed', processed_at=now()`.
    - On failure → increments `attempts`, reverts to `pending` or marks `failed` after max attempts.

**Idempotency:**  
Each enqueue uses meaningful keys:
- Refunds keyed by `txSignatureKey` (original wager signature) stored in `wager_events`.
- Payouts keyed by match + escrow; server never directly double-enqueues for the same `matchId` + escrow combination.
The `payment_jobs` processor itself is idempotent per job ID; retries do not duplicate `transactions` rows for identical payloads.

---

## 6. Solana Integration (Escrow, Wager, Payout, Refund)

### 6.1 Connection and helpers

- `lib/solana-utils.ts`
  - `getSolanaConnection()`:
    - Uses `NEXT_PUBLIC_SOLANA_RPC_URL` or mainnet-beta.
    - Commitment: `'confirmed'`.
  - `solToLamports`, `lamportsToSol`.
  - `buildTransferTransaction(fromPubkey, toPubkey, amountSol)`:
    - Constructs unsigned transaction with `SystemProgram.transfer`.
    - Sets recent blockhash & `lastValidBlockHeight`.
    - Serializes to base64 without signatures; used by `/api/wager`.
  - `getTransactionDetails(signature)`:
    - Fetches full parsed transaction (v0 supported).
    - Used for server-side wager verification.

### 6.2 Escrow wallet rotation

- `lib/escrow-service.ts`
  - Uses Supabase **service-role** client (never anon).
  - `getActiveWallet()`:
    - Reads `escrow_state.active_wallet`, returns `{ id: 'A' | 'B', publicKey }`.
  - `rotateWallet()`:
    - Flips `active_wallet` A↔B after payouts (admin- or worker-triggered).
  - `getAllWallets()`:
    - Returns `walletA`, `walletB`, and current `active`.

Private keys:
- `<ENV>`:  
  - `ESCROW_WALLET_A_PUBLIC_KEY`, `ESCROW_WALLET_A_PRIVATE_KEY (base64)`,  
  - `ESCROW_WALLET_B_PUBLIC_KEY`, `ESCROW_WALLET_B_PRIVATE_KEY (base64)`.
- `payoutFromEscrow` / `refundFromEscrow` map from public key → secret (base64) to build `Keypair`.

### 6.3 Wager creation (client API)

- `app/api/wager/route.ts`:
  - Validates payload via `zod` (`lobbyId`, `playerPublicKey`).
  - Validates `playerPublicKey` is a valid Solana address.
  - Looks up lobby in `HARDCODED_LOBBIES`.
  - If `wager === 0`: returns `{ isFree: true }` (UI can skip tx).
  - Otherwise:
    - Fetches active escrow wallet from `EscrowService`.
    - Calls `buildTransferTransaction(playerPublicKey, escrowWallet.publicKey, lobby.wager)`.
    - Returns base64 transaction to client, plus `escrowWallet`, `amount`, `lobbyId`.

### 6.4 Wager signing (client hook)

- `hooks/use-wager.ts`:
  - `requestWager(lobbyId)` → POST `/api/wager`.
  - `signAndSendWager()`:
    - Deserializes base64 transaction.
    - Uses wallet adapter `signTransaction` then `connection.sendRawTransaction`.
    - Waits for `'confirmed'` via `confirmTransaction`.
  - `executeWager(lobbyId)`:
    - Runs `requestWager` then `signAndSendWager`.
    - Returns `{ signature, amount, escrowWallet }`.

### 6.5 Wager verification (server)

- In `confirm_wager` handler (`server/socket-server.ts`):
  - Given `lobbyId` and `txSignature`:
    1. Fetches complete transaction via `getTransactionDetails`.
    2. Resolves escrow public keys via `EscrowService.getAllWallets()`.
    3. Locates indexes for:
       - Player wallet in account keys.
       - Escrow wallet (A or B) in account keys.
    4. Computes balance deltas:
       - `playerDelta = preBalances[playerIndex] - postBalances[playerIndex]` (includes fee).
       - `escrowDelta = postBalances[escrowIndex] - preBalances[escrowIndex]`.
    5. Computes expected lamports for `lobby.wager` and asserts:
       - `escrowDelta === expectedLamports`.
    6. On success:
       - Marks `PlayerState.wagerLocked = true`, stores `txSignature`, `escrowAddress`, and `wagerAmountSol`.
       - Updates `lobby_players` via `updateLobbyPlayerWager`.
       - Inserts/updates `wager_events` row with `status='locked'`.
       - Broadcasts `lobby_state` and tries `tryStartCountdown(lobby)`.
    7. On failure:
       - Emits `ServerToClient.error` with specific code (`ERR_NO_SIG`, `ERR_TX_NOT_FOUND`, `ERR_PARTICIPANTS`, `ERR_AMOUNT`, `ERR_VERIFY`).

Result: server **never trusts the client** about whether the wager was paid; it verifies the on-chain transfer and that the escrow wallet received the exact configured amount.

### 6.6 Payouts

- `lib/payout-service.ts`:
  - `payoutFromEscrow({ escrowPublicKey, winnerPublicKey, totalPotSol, adminWalletPublicKey, houseCutPercentage })`:
    - Splits pot into `winnerAmountSol` and `houseAmountSol`.
    - Builds atomic transaction with two `SystemProgram.transfer` instructions:
      - Escrow → Winner,
      - Escrow → Admin.
    - Signs with the escrow `Keypair`.
    - Sends via `sendRawTransaction` and confirms.
    - Returns `{ signature, winnerAmountSol, houseAmountSol }`.
- Jobs:
  - Each payout job uses the above and logs `transactions` rows accordingly.

### 6.7 Refunds

- `lib/refund-service.ts`:
  - `refundFromEscrow({ escrowPublicKey, playerPublicKey, amountSol })`:
    - Builds single transfer escrow → player.
    - Signs with escrow keypair, sends, and confirms.
  - Jobs:
    - Enqueued for:
      - Players kicked during countdown,
      - Players who leave lobby after locking and before match start,
      - Any explicit "lobby fails to start" edge cases wired via job queue.
    - On success, updates `wager_events.status='refunded'` and logs `transactions` as `refund`.

---

## 7. Error Handling, Recovery, and Edge Cases

### 7.1 Socket-level errors

- `useLobbySocket`:
  - Handles `connect_error` with:
    - Fallback from primary `path` → `/socket.io`.
    - Fallback through multiple host candidates (`NEXT_PUBLIC_SOCKET_URL`, `window.location.origin`, `localhost:4001` in dev).
  - Final fallback: optional HTTP-based roster via `/api/lobbies/:id/players` if enabled.
  - Surfaces `ServerToClient.error.message` into component state.

### 7.2 Disconnects and reconnects

- Lobby side:
  - `disconnect` removes players from in-memory lobbies and from `lobby_players`.
  - `syncLobbyPlayerCountDb` keeps `current_players` accurate.
- Match side:
  - Per-socket `socketToMatch` ensures no stray `playerStateUpdate` once disconnected.
  - Spectator camera + HUD gracefully handle missing remote state (auto-switch or no-focus).
  - Future enhancement (pattern-ready): treat disconnected within match as "spectator" and tie to Supabase `match_state` with grace periods.

### 7.3 Refund and cancellation

- Pre-match:
  - Leaving lobby or being kicked during countdown triggers refunds where:
    - Lobby is paid,
    - `wagerLocked == true`,
    - Not already refunded (`processedRefunds` set),
    - Match not started yet.
  - Description strings (`'Auto-refund: player left lobby'`, `'Auto-refund: countdown kick'`) are persisted into `payment_jobs.payload` and then into `transactions`.

- Match fails to start:
  - If all players are pruned during countdown, countdown clears and lobby resets; any previously locked wagers were already queued for refund during the kick pass.

### 7.4 Match integrity & idempotency

- Wagers:
  - Verified via full on-chain transaction inspection (payer/escrow + amount).
  - `wager_events.tx_signature` is unique and used as a natural idempotency key.
- Payouts:
  - All executed via `payment_jobs` queue; each job is processed at most once to completion, with explicit retry semantics.
  - `match_state` and `transactions` provide cross-checks in logs and dashboards.
- Refunds:
  - Deduplicated both via:
    - `processedRefunds` set in memory per process,
    - `wager_events.tx_signature` uniqueness and `status`.

---

## 8. Client/Server Event Map & State Machines

### 8.1 Client → Server events

From lobby UI (`useLobbySocket`):
- `message` with:
  - `join_lobby` `{ lobbyId, username, wallet }`
  - `confirm_wager` `{ lobbyId, amount, txSignature }`
  - `set_ready` `{ lobbyId, ready }`
  - `leave_lobby` `{ lobbyId }`
  - `reconnect` `{ lobbyId, lastEventId? }` (basic support for re-joining lobbies)
  - `admin_end_match` (admin only)
  - `match_result` (from game client as fallback result source)

From game scene (`RoyaleGameScene` + `SumoArenaScene`):
- `register_identity` (wallet or guest ID).
- `join_match_room` `{ matchSessionId: matchId }`.
- `playerStateUpdate` `{ position: [x,y,z], rotation: [x,y,z,w] }`.

### 8.2 Server → Client events

lobby rooms (`lobby.id`):
- `message`:
  - `lobby_state` with players, wager flags, and countdown.
  - `error` with `code` and human-readable `message`.
  - `match_start` with `GameStartPacket`.

match rooms (`matchId`):
- `gameStatusUpdate`:
  - `gameState`, `players[]`, `countdown?`, `message?`.
- `player_eliminated`:
  - `{ matchId, playerId }`.
- `match_finished`:
  - `{ matchId, winner }`.

### 8.3 Client state machines

**Lobby player state (conceptual):**
- `JOINED` → `UNPAID` (paid lobbies only) → `PROCESSING` → `PAID` → `READY` → `IN MATCH`.
- Transitions enforced by:
  - Wager button (`useWager + confirm_wager`) → `PAID`.
  - Ready button (`set_ready`) gated on `wagerLocked`.
  - Countdown auto-kick resets to `OUT` (+ refund) if not both `READY` & `PAID`.

**Game state:**
- `WAITING` → `STARTING_COUNTDOWN` → `ACTIVE` → `ROUND_OVER?` → `GAME_OVER`.
- Server drives transitions via `gameStatusUpdate.gameState`, client reflects via `internalGameState`.

---

## 9. Production Notes (Render + Supabase + Solana)

- **Render server:**
  - `server/socket-server.ts` is a standalone Node/Express/Socket.IO service.
  - `/health` exposes metrics (joins, leaves, matches, payments) for monitoring.
  - Uses in-memory maps for lobbies and active matches; Supabase for persistence, analytics, and payment-job durability.

- **Supabase:**
  - Migrations in `supabase/migrations/*.sql` and `db/sumo_schema.sql` must be applied to the same project.
  - Requires RLS policies tuned to only expose appropriate views/tables (`transactions`, `match_results`, etc.) to the client.

- **Solana:**
  - RPC: `NEXT_PUBLIC_SOLANA_RPC_URL` must point to mainnet (or devnet for testing).
  - Wallets:
    - Player side uses browser wallet adapter (Phantom, Solflare) for `/api/wager` flows.
    - Escrow/private keys **never** touch client; they live only as base64 secrets in server env and are used by payout/refund services.

This architecture yields a deterministic, server-authoritative Sumo experience with:
- Verified on-chain wagers,
- Rotating escrow management,
- Durable, idempotent payouts/refunds,
- Robust lobby and match lifecycle,
- Clear logging and Supabase-backed audit trails.


