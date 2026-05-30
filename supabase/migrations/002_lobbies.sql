-- Lobbies and Lobby Players for HTTP fallback + admin tools
-- Run in Supabase SQL editor (safe to re-run)

-- Lobbies table (ids are string-based to match hardcoded config)
create table if not exists lobbies (
  id text primary key,
  name text not null,
  wager_amount numeric(12,6) not null default 0,
  max_players integer not null default 4,
  current_players integer not null default 0,
  status text not null default 'open', -- open|countdown|closed
  created_by text,
  created_at timestamptz default now()
);

create index if not exists idx_lobbies_status on lobbies(status);
create index if not exists idx_lobbies_created on lobbies(created_at desc);

-- Lobby players roster
create table if not exists lobby_players (
  id uuid primary key default gen_random_uuid(),
  lobby_id text not null,
  wallet_address text not null,
  username text,
  is_ready boolean not null default false,
  wager_amount numeric(12,6),
  wager_confirmed boolean not null default false,
  joined_at timestamptz default now()
);

create unique index if not exists uq_lobby_wallet on lobby_players(lobby_id, wallet_address);
create index if not exists idx_lobby_players_lobby on lobby_players(lobby_id);
create index if not exists idx_lobby_players_joined on lobby_players(joined_at desc);

-- Optional FK (commented to avoid seed dependency); uncomment if you seed first.
-- alter table lobby_players
--   add constraint fk_lobby_players_lobby
--   foreign key (lobby_id) references lobbies(id) on delete cascade;

-- Seed lobbies to match app/shared hardcoded IDs (idempotent)
insert into lobbies (id, name, wager_amount, max_players, current_players, status)
values
  ('free-test-match', 'Free Lobby', 0, 4, 0, 'open'),
  ('small-sumo-005', 'Low Wager', 0.05, 4, 0, 'open'),
  ('medium-sumo-025', 'Medium Wager', 0.25, 4, 0, 'open')
on conflict (id) do update set
  name = excluded.name,
  wager_amount = excluded.wager_amount,
  max_players = excluded.max_players,
  status = excluded.status;

-- Hide obsolete seed rows from older resets without deleting historical data.
update lobbies
set status = 'closed'
where id in ('small-sumo-01', 'small-sumo-4', 'big-sumo-6', 'pookiemania-8')
  and current_players = 0;


