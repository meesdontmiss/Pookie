# Pookie Sumo Ball - Economy Implementation Plan

## Overview
Complete wager, escrow, match result, and payout system for Pookie Sumo Ball based on proven Cock Combat patterns.

---

## System Architecture

### 1. **Wager Flow** (Pre-Match)
```
Player joins lobby → Confirms wager → Transaction sent to escrow → Ready up → Match starts
```

### 2. **Match Flow** (During Game)
```
Match starts → Players compete → Winner determined → Server validates → Payout triggered
```

### 3. **Payout Flow** (Post-Match)
```
Winner validated → Escrow released → House cut deducted → Winner receives payout → DB updated
```

---

## Implementation Checklist

### Phase 1: Wager System ✅ (Partially Done)
- [x] Hardcoded lobbies with wager amounts
- [x] Guest identity for free matches
- [x] Lobby socket with wager confirmation events
- [ ] **TODO:** Create `/api/wager` route (Solana transaction builder)
- [ ] **TODO:** Implement escrow wallet rotation (A/B wallets)
- [ ] **TODO:** Add wager confirmation UI in lobby panel
- [ ] **TODO:** Lock players from ready-up until wager confirmed

### Phase 2: Match Tracking
- [ ] **TODO:** Create `match_results` table in Supabase
- [ ] **TODO:** Server records match start with participants
- [ ] **TODO:** Track match state (pending → active → completed)
- [ ] **TODO:** Store escrow wallet ID per match
- [ ] **TODO:** Implement idempotency keys for match creation

### Phase 3: Game Result Validation
- [ ] **TODO:** Server-side winner determination (authoritative)
- [ ] **TODO:** Validate match completion (no early exits)
- [ ] **TODO:** Handle disconnects/refunds
- [ ] **TODO:** Prevent double-payouts with idempotency
- [ ] **TODO:** Emit `match_end` event with winner

### Phase 4: Payout System
- [ ] **TODO:** Create `/api/payout` route (server-only secret)
- [ ] **TODO:** Calculate prize pool (wager × players)
- [ ] **TODO:** Deduct house cut (default 4%)
- [ ] **TODO:** Transfer from escrow to winner
- [ ] **TODO:** Transfer house cut to admin wallet
- [ ] **TODO:** Record transactions in DB
- [ ] **TODO:** Emit `payout_success` to winner's socket

### Phase 5: Refund System
- [ ] **TODO:** Detect match cancellations (not enough players, server crash)
- [ ] **TODO:** Refund all participants from escrow
- [ ] **TODO:** Update match status to 'cancelled'
- [ ] **TODO:** Notify players via socket

### Phase 6: UI/UX
- [ ] **TODO:** Show wager confirmation modal in lobby
- [ ] **TODO:** Display "Wagering..." loading state
- [ ] **TODO:** Show match winnings notification
- [ ] **TODO:** Add transaction history page
- [ ] **TODO:** Display balance updates in real-time

---

## Database Schema

### `match_results` Table
```sql
create table if not exists match_results (
  id uuid primary key default gen_random_uuid(),
  lobby_id text not null,
  escrow_wallet_id text,
  match_started_at timestamptz not null,
  match_ended_at timestamptz,
  winner_wallet text,
  total_prize_pool numeric(12,6) not null,
  house_cut_amount numeric(12,6),
  participants jsonb not null, -- [{wallet, wager_amount}]
  game_data jsonb,
  status text not null default 'pending', -- pending|active|completed|cancelled
  payout_processed boolean default false,
  payout_tx_signature text,
  idempotency_key text unique,
  created_at timestamptz default now()
);
```

### `transactions` Table
```sql
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  transaction_type text not null, -- 'wager'|'win'|'refund'|'house_cut'
  amount numeric(12,6) not null,
  related_entity_id uuid, -- match_results.id
  description text,
  tx_signature text,
  created_at timestamptz default now()
);
```

### `escrow_state` Table
```sql
create table if not exists escrow_state (
  id serial primary key,
  active_wallet char(1) not null default 'A', -- 'A' or 'B'
  wallet_a text not null,
  wallet_b text not null,
  updated_at timestamptz default now()
);
```

---

## API Routes

### 1. `/api/wager` (POST)
**Purpose:** Create unsigned Solana transaction for player → escrow transfer

**Request:**
```json
{
  "lobbyId": "small-sumo-4",
  "playerPublicKey": "ABC123..."
}
```

**Response:**
```json
{
  "transaction": "base64EncodedTransaction",
  "escrowWallet": "ESC123...",
  "amount": 0.25
}
```

**Logic:**
1. Find lobby, get wager amount
2. Get active escrow wallet (A or B rotation)
3. Build Solana transfer instruction
4. Return unsigned transaction for client to sign

---

### 2. `/api/payout` (POST - Server Only)
**Purpose:** Execute payout after match completion

**Request:**
```json
{
  "secret": "PAYOUT_SERVER_SECRET",
  "winnerAddress": "WINNER123...",
  "prizePool": 1.0,
  "matchId": "uuid",
  "escrowWalletId": "A"
}
```

**Response:**
```json
{
  "success": true,
  "winnerTransaction": "tx_sig_123",
  "houseTransaction": "tx_sig_456",
  "winnerAmount": 0.96,
  "houseAmount": 0.04
}
```

**Logic:**
1. Validate server secret
2. Calculate house cut (4% default)
3. Transfer from escrow to winner
4. Transfer house cut to admin wallet
5. Record transactions in DB
6. Update match_results.payout_processed = true
7. Emit socket event to winner

---

## Socket Events

### Client → Server
- `confirm_wager` - Player confirms wager transaction sent
- `match_action` - Player action during game (already exists)

### Server → Client
- `wager_confirmed` - Server acknowledges wager
- `match_start` - Match begins with full payload
- `match_end` - Match ends with winner
- `payout_success` - Winner receives payout notification

---

## Environment Variables

```env
# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_ADMIN_WALLET=YourAdminWallet...
SOLANA_PRIVATE_KEY_ESCROW_A=base64...
SOLANA_PRIVATE_KEY_ESCROW_B=base64...

# Payout
PAYOUT_SERVER_SECRET=random_secret_key_here
HOUSE_CUT_PERCENTAGE=0.04

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Security Considerations

1. **Idempotency:** Use unique keys to prevent double-payouts
2. **Server Authority:** Only server can trigger payouts (secret key)
3. **Escrow Rotation:** Alternate between wallets A/B to prevent single point of failure
4. **Transaction Validation:** Verify on-chain before marking wager as confirmed
5. **Refund Logic:** Auto-refund if match doesn't start within timeout
6. **Rate Limiting:** Prevent spam wager requests

---

## Testing Plan

### Unit Tests
- [ ] Wager transaction builder
- [ ] House cut calculation
- [ ] Escrow wallet rotation
- [ ] Idempotency key generation

### Integration Tests
- [ ] Full wager → match → payout flow
- [ ] Refund on match cancellation
- [ ] Multiple players in same match
- [ ] Socket event propagation

### Manual Tests
- [ ] Join free match (no wager)
- [ ] Join ranked match (0.05 SOL)
- [ ] Win match and receive payout
- [ ] Disconnect mid-match (refund)
- [ ] Check transaction history

---

## Next Steps

**Immediate Priority:**
1. Create `/api/wager` route
2. Set up Supabase tables
3. Implement match result recording in socket server
4. Create `/api/payout` route
5. Test end-to-end with devnet SOL

**After Core Works:**
- Add transaction history UI
- Implement leaderboards
- Add match replay system
- Create admin dashboard for monitoring

