# Pookie Poker Architecture

Pookie Poker is now shaped as a backend-custodied poker product backed by Neon Postgres. It no longer uses Solana smart contracts for table escrow.

Real-money mode is explicitly disabled by default:

```env
POOKIE_POKER_REAL_MONEY_ENABLED=false
POOKIE_POKER_SMART_CONTRACTS_ENABLED=false
```

## What Exists

- Shared contracts: `shared/pookie-poker`
- Deterministic engine: `server/poker-engine`
- Engine tests: `npm run test:poker`
- Socket privacy tests: `npm run test:poker:socket`
- Fake-chip Socket.IO server: `server/pookie-poker-server.ts`
- Poker lobby/table routes: `app/pookie-poker`
- 2D HUD components: `components/pookie-poker/hud`
- Visual-only 3D rooftop scene: `components/pookie-poker/three/PokerScene.tsx`
- Neon schema: `db/neon_pookie_poker.sql`
- Neon persistence: `server/pookie-poker/persistence.ts`
- Custody ledger service: `server/pookie-poker/custody-ledger.ts`

## Run Commands

```bash
npm run test:poker
npm run test:poker:socket
npm run start:poker-server
npm run dev
```

Open:

- `http://localhost:3000/pookie-poker`
- `http://localhost:3000/pookie-poker/table/neon-rooftop-1`

## Neon

Set `NEON_DATABASE_URL` or `DATABASE_URL` to a Neon Postgres connection string. For production or many concurrent app/serverless connections, use the pooled Neon hostname containing `-pooler`.

Apply:

```bash
psql "$NEON_DATABASE_URL" -f db/neon_pookie_poker.sql
```

## Custody Model

The product uses backend custody with hot/cold wallet storage:

- Player deposits are observed on-chain into the configured hot wallet.
- Neon stores deposit records, custody accounts, and balanced double-entry ledger entries.
- Player/table/rake balances are Neon ledger balances, not smart contract balances.
- Withdrawals are requests first, then risk/manual approval, then hot-wallet broadcast.
- Cold-wallet sweeps are explicit `poker_wallet_sweeps` rows and should require manual approval.
- Private keys must not be stored in Neon. Use KMS/HSM or encrypted runtime secrets for hot-wallet signing.
- Cold-wallet private keys stay offline.

## Current Boundaries

The engine uses bigint lamports and deterministic seed-based shuffling. The socket server is authoritative for table state and filters private hole cards per socket view.

The 3D scene is atmospheric only. Real game truth lives in backend state, action logs, settlement calculations, fairness receipts, and Neon ledger records.

## Next Work

1. Add Solana RPC deposit watcher for hot-wallet deposits.
2. Add withdrawal broadcaster with risk/manual approval.
3. Add hot-to-cold sweep job and approval workflow.
4. Derive player available balances from `poker_ledger_entries`.
5. Add KYC/geofence/provider adapters behind feature flags before any real-money beta.
6. Add admin controls for pausing tables, freezing withdrawals, and reviewing sweeps.
