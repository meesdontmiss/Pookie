-- Wager submissions/events (idempotency + audit of per-lobby wagers)
-- Complements 'transactions' and 'match_results'

create table if not exists wager_events (
  id uuid primary key default gen_random_uuid(),
  lobby_id text not null,
  wallet_address text not null,
  amount numeric(12,6) not null,
  tx_signature text unique,          -- unique per on-chain transfer (nullable for free)
  status text not null default 'submitted', -- 'submitted'|'locked'|'refunded'|'paid'
  created_at timestamptz default now()
);

create index if not exists idx_wagers_lobby on wager_events(lobby_id);
create index if not exists idx_wagers_wallet on wager_events(wallet_address);
create index if not exists idx_wagers_status on wager_events(status);

-- Optional: at most one active submitted/locked per player per lobby
-- Uncomment if desired (partial unique index)
-- create unique index if not exists uq_wager_one_active_per_lobby
-- on wager_events(lobby_id, wallet_address)
-- where status in ('submitted','locked');


