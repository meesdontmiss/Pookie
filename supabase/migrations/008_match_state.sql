-- Match state persistence for authoritative sync + analytics

create table if not exists match_state (
  id uuid primary key,
  lobby_id text not null,
  game_mode text,
  seed integer,
  roster jsonb not null, -- [{ wallet, username, isAi }]
  status text not null default 'pending', -- pending | active | completed | cancelled
  started_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz,
  winner_wallet text,
  house_payout_signature text,
  pot_payout_signature text
);

create index if not exists idx_match_state_lobby on match_state(lobby_id);
create index if not exists idx_match_state_status on match_state(status);
create index if not exists idx_match_state_started on match_state(started_at desc);

drop trigger if exists trg_match_state_updated_at on match_state;
create trigger trg_match_state_updated_at
  before update on match_state
  for each row execute function set_updated_at();

