# Pookie Poker Architecture

This repo now has the first play-money poker slice under `pookie-poker` namespaces.

Real-money mode is explicitly disabled by default:

```env
POOKIE_POKER_REAL_MONEY_ENABLED=false
```

## What Exists

- Shared contracts: `shared/pookie-poker`
- Deterministic engine: `server/poker-engine`
- Engine tests: `npm run test:poker`
- Fake-chip Socket.IO server: `server/pookie-poker-server.ts`
- Poker lobby/table routes: `app/pookie-poker`
- 2D HUD components: `components/pookie-poker/hud`
- Visual-only 3D rooftop scene: `components/pookie-poker/three/PokerScene.tsx`
- Database migration scaffold: `supabase/migrations/011_pookie_poker.sql`
- Anchor escrow scaffold: `programs/pookie_poker`

## Run Commands

```bash
npm run test:poker
npm run start:poker-server
npm run dev
```

Open:

- `http://localhost:3000/pookie-poker`
- `http://localhost:3000/pookie-poker/table/neon-rooftop-1`

## Current Boundaries

The engine uses bigint lamports and deterministic seed-based shuffling. The fake-chip socket server is authoritative for table state and filters private hole cards per socket view.

The 3D scene is intentionally atmospheric. The real game truth is the backend hand state, action log, settlement calculation, and eventual on-chain receipts.

## Next Work

1. Wire the frontend table client to the fake-chip socket namespace.
2. Persist hands/actions/settlements to Supabase using `011_pookie_poker.sql`.
3. Add reconnect snapshots and timer-driven auto-check/auto-fold.
4. Expand betting tests for heads-up blind rotation, min-raise edge cases, and all-in streets.
5. Build devnet Anchor tests for escrow buy-in, settlement, cash-out, pause, and dispute.
6. Add KYC/geofence/provider adapters behind feature flags before any real-money beta.

