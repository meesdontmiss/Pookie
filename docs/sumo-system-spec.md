## Pookie Sumo Ball - Authoritative Lobby/Wager/Ready System

This document defines the final, simplified, house-hosted lobby system and all contracts to implement it end-to-end.

### 1) Codebase overview (keep vs remove)

- Keep
  - `app/pookiesumoroyale/lobby-browser/` (new glassmorphic UI)
  - `components/plug-penguin/minigames/pookie-sumo-royale/` (game scene and logic)
  - `public/models/IGLOO.glb` (lobby background)
  - `shared/` (contracts + hardcoded lobbies)
  - `components/lobby/` (igloo-bg + lobby-panel)
- Remove/Archive
  - Old lobby CRUD and Supabase-driven dynamic rooms
  - Any non-sumo minigames, unused socket handlers, legacy physics scene junk
  - Any create-lobby UI (we’ve removed)

### 2) Rebuilt Lobby System (authoritative)

- House-hosted only, no user-created rooms
- Lobbies are hardcoded (`shared/hardcoded-lobbies.ts`):
  - id, name, gameMode, capacity, wager
- Server tracks per-lobby room state:
  - players: { wallet, username, ready, wagerLocked }
  - countdown: null | number
  - transitions:
    - join → must connect wallet
    - confirm_wager → escrow lock (server-side)
    - set_ready(true)
    - server auto-kicks unready/unwagered during countdown tick
    - at 0: server emits match_start with authoritative packet

### 3) Event Contracts

Client → Server
```ts
type ClientToServer =
  | { type: 'join_lobby'; lobbyId: string; username: string; wallet: string }
  | { type: 'confirm_wager'; lobbyId: string; amount: number }
  | { type: 'set_ready'; lobbyId: string; ready: boolean }
  | { type: 'leave_lobby'; lobbyId: string }
  | { type: 'reconnect'; lobbyId: string; lastEventId?: string }
```

Server → Client
```ts
type ServerToClient =
  | { type: 'lobby_state'; lobbyId: string; players: UIRoomPlayer[]; countdown?: number; status: 'open' | 'countdown' }
  | { type: 'error'; message: string; code: string }
  | { type: 'kicked'; reason: string }
  | { type: 'match_start'; payload: GameStartPacket }
```

Types
```ts
interface UIRoomPlayer { id: string; username: string; walletShort: string; wager: number; ready: boolean }
interface GameStartPacket {
  matchId: string; seed: number;
  players: Array<{ id: string; username: string; skin: string; spawnIndex: number }>;
  wagerAmount: number; gameMode: string; serverTimestamp: number;
}
```

Error states
- `ERR_ALREADY_IN_LOBBY`, `ERR_LOBBY_FULL`, `ERR_WAGER_LOCK_FAILED`, `ERR_NOT_READY`, `ERR_NOT_WAGERED`

Reconnections
- Client sends `{ type: 'reconnect', lobbyId, lastEventId }`, server replays last lobby_state and resumes countdown if applicable.

### 4) Database Layout (Supabase)

DDL provided in `db/sumo_schema.sql`. Tables:
- `matches(id, game_mode, wager_amount, escrow_wallet, house_cut_bps, status, seed, …, idempotency_key)`
- `match_players(id, match_id, wallet, username, ready, wager_locked, spawn_index, skin, …)`
- `lobby_sessions(id, lobby_id, wallet, username, ready, wager_confirmed, last_seen, session_state)`
- `escrow_state(id, active_wallet, wallet_a, wallet_b, updated_at)`
- `payouts(id, match_id, wallet, amount, house_cut, status, tx_signature, idempotency_key)`

Example rows included in comments. Indexes and idempotency keys provided.

### 5) Escrow Wallet Flow

- Two rotating wallets `A` and `B` in `escrow_state`
- Selection: server reads `active_wallet`, alternates on each new match
- Locking pot:
  - Sum of confirmed wagers = `pot`
  - House takes 5% → `house = pot * 0.05`, `prize = pot - house`
  - Record `matches` row with escrow wallet + idempotency key
- Payouts:
  - On match end, calculate winners → insert rows into `payouts` with idem keys
  - Transfer from escrow; mark `payouts.status = 'paid'` with `tx_signature`
  - Failures → retry idempotently; on terminal failure → refund entries with reason

### 6) Game-Start Packet

```json
{
  "matchId": "uuid",
  "seed": 123456789,
  "players": [
    { "id": "p1", "username": "Alice", "skin": "default", "spawnIndex": 0 }
  ],
  "wagerAmount": 0.50,
  "gameMode": "BIG_SUMO",
  "serverTimestamp": 1733180400000
}
```

### 7) Cleanup & Disconnections

- Before start: disconnect = remove from session and (if countdown) kick
- During game: disconnect = flip to spectate; no payout eligibility unless rejoin within grace (server policy)
- Refunds: if match fails to start after pot locked: full refund less network fees; logged in `payouts` as `refunded`

### 8) Migration & Refactor Plan

1. Apply `db/sumo_schema.sql` on Supabase
2. Deploy new Socket server (Render). Env:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ESCROW_WALLET_A`, `ESCROW_WALLET_B`
   - `HOUSE_CUT_BPS=500`
3. Point client to Socket URL (future `socket-client.ts`)
4. Remove/archive legacy lobbies, creators, unused minigames
5. QA checklist:
   - Join/leave flows across multiple clients
   - Wager confirm → ready → countdown → autopruning
   - Idempotent payouts (simulate retries)
   - Reconnect during countdown and mid-match

### 9) Roadmap (next PR)

- Implement `socket-client.ts` and wire panel to live events
- Render server: `/server` code with `socket.io`, handlers, escrow integration
- End-to-end payouts smoke tests


