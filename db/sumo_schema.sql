-- Pookie Sumo Ball authoritative schema
-- Idempotent-safe: use IF NOT EXISTS guards

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  game_mode text not null,
  wager_amount numeric(12,6) not null,
  escrow_wallet text not null,
  house_cut_bps integer not null default 500,
  status text not null default 'pending', -- pending|active|completed|cancelled
  seed bigint not null,
  server_region text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  idempotency_key text unique
);

create table if not exists match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  wallet text not null,
  username text,
  ready boolean not null default false,
  wager_locked boolean not null default false,
  spawn_index integer,
  skin text,
  join_ts timestamptz not null default now(),
  unique (match_id, wallet)
);
create index if not exists idx_match_players_match on match_players(match_id);

create table if not exists lobby_sessions (
  id uuid primary key default gen_random_uuid(),
  lobby_id text not null,
  wallet text not null,
  username text,
  ready boolean not null default false,
  wager_confirmed boolean not null default false,
  last_seen timestamptz not null default now(),
  session_state jsonb,
  unique (lobby_id, wallet)
);
create index if not exists idx_lobby_sessions_lobby on lobby_sessions(lobby_id);

create table if not exists escrow_state (
  id serial primary key,
  active_wallet char(1) not null default 'A', -- 'A' or 'B'
  wallet_a text not null,
  wallet_b text not null,
  updated_at timestamptz not null default now(),
  constraint ck_active_wallet check (active_wallet in ('A','B'))
);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  wallet text not null,
  amount numeric(12,6) not null,
  house_cut numeric(12,6) not null default 0,
  status text not null default 'pending', -- pending|paid|failed|refunded
  tx_signature text,
  created_at timestamptz not null default now(),
  idempotency_key text unique
);
create index if not exists idx_payouts_match on payouts(match_id);

-- Example rows
-- insert into escrow_state (wallet_a, wallet_b) values ('ESCROW_WALLET_A','ESCROW_WALLET_B') on conflict do nothing;


