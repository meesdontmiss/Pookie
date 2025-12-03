# Pookie Sumo Ball

Single focus: one polished, server-authoritative Sumo arena with real SOL wagering and a lightweight social igloo hub.

## What’s in this repo

- **Start screen** – cinematic landing with direct access to the igloo hub or Sumo lobbies.
- **Igloo hub** – optional hangout/chat space outside the main arena.
- **Lobby browser + room** – backed by Supabase (lobbies, players, wagers, readiness).
- **Game scene** – React Three Fiber + Rapier client rendering hooked to the authoritative server.
- **Server** – Express + Socket.IO backend orchestrating physics, escrow rotation, payouts.

Everything else (old mini-games, dev tools, docs) has been removed.

## Tech stack

- Next.js 14 (App Router) + Tailwind CSS
- React Three Fiber + Rapier
- Socket.IO (client/server)
- Supabase (Postgres + Realtime) – tables: `lobbies`, `games`, `game_players`, `transactions`, `payouts`, `refunds`, `escrow_wallets`
- Solana Web3.js for escrow wallets and payouts

## Getting started

```bash
npm install
npm run dev        # client at http://localhost:3000
npm run start:server  # socket/io + physics backend on http://localhost:3001
```

Set the following env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `NEXT_PUBLIC_SERVER_URL`
- `SUPABASE_SECRET` / Solana wallet secrets (see `supabase/pookie-sumo-schema.sql`)

## Supabase schema

`supabase/pookie-sumo-schema.sql` creates every required table/index/RLS policy and must be run on a clean project. Update it first if you need to modify columns.

## Server commands

```bash
cd server
npm install
npm start
```

The server expects the same Supabase + Solana env vars plus escrow wallet seeds.

## Deployment

- Client → Vercel (or any Next.js host)
- Server → Render (or any Node host)
- Database → Supabase

## Status

The repo is trimmed for the Sumo Ball production push. Any new features should plug directly into the Supabase schema + server-authoritative flow described above. 