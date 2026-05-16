-- Pookie Poker persistence scaffold.
-- Real-money mode must remain gated by POOKIE_POKER_REAL_MONEY_ENABLED=false until legal/compliance approval.

create table if not exists poker_tables (
  id uuid primary key default gen_random_uuid(),
  table_id text not null unique,
  creator_wallet text,
  table_type text not null check (table_type in ('public', 'private')),
  game_type text not null default 'texas_holdem',
  currency_mint text,
  small_blind_lamports numeric(40, 0) not null,
  big_blind_lamports numeric(40, 0) not null,
  min_buy_in_lamports numeric(40, 0) not null,
  max_buy_in_lamports numeric(40, 0) not null,
  max_players integer not null check (max_players in (2, 6, 9)),
  rake_bps integer not null check (rake_bps >= 0),
  rake_cap_lamports numeric(40, 0) not null,
  status text not null default 'waiting',
  invite_code text,
  password_hash text,
  region_policy_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists poker_table_players (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references poker_tables(table_id) on delete cascade,
  wallet text not null,
  display_name text not null,
  avatar_url text,
  seat_index integer,
  stack_lamports numeric(40, 0) not null default 0,
  status text not null default 'joined',
  connected boolean not null default false,
  last_seen_at timestamptz,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (table_id, wallet),
  unique (table_id, seat_index)
);

create table if not exists poker_hands (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references poker_tables(table_id) on delete cascade,
  hand_number integer not null,
  status text not null,
  dealer_seat integer not null,
  small_blind_seat integer,
  big_blind_seat integer,
  server_seed_hash text not null,
  server_seed_revealed text,
  vrf_proof_hash text,
  deck_commitment text not null,
  board_cards_encrypted_or_public jsonb not null default '[]'::jsonb,
  action_log_hash text,
  result_hash text,
  rake_lamports numeric(40, 0) not null default 0,
  tx_signature text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (table_id, hand_number)
);

create table if not exists poker_actions (
  id uuid primary key default gen_random_uuid(),
  hand_id uuid not null references poker_hands(id) on delete cascade,
  table_id text not null,
  wallet text not null,
  seat_index integer not null,
  action_type text not null,
  amount_lamports numeric(40, 0) not null default 0,
  street text not null,
  sequence_number integer not null,
  state_hash_before text not null,
  state_hash_after text not null,
  created_at timestamptz not null default now(),
  unique (hand_id, sequence_number)
);

create table if not exists poker_settlements (
  id uuid primary key default gen_random_uuid(),
  hand_id uuid not null references poker_hands(id) on delete cascade,
  table_id text not null,
  wallet text not null,
  delta_lamports numeric(40, 0) not null,
  rake_contributed_lamports numeric(40, 0) not null default 0,
  final_stack_lamports numeric(40, 0) not null,
  created_at timestamptz not null default now()
);

create table if not exists poker_deposits (
  id uuid primary key default gen_random_uuid(),
  table_id text not null,
  wallet text not null,
  amount_lamports numeric(40, 0) not null,
  mint text not null,
  tx_signature text unique,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists poker_withdrawals (
  id uuid primary key default gen_random_uuid(),
  table_id text not null,
  wallet text not null,
  amount_lamports numeric(40, 0) not null,
  mint text not null,
  tx_signature text unique,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists poker_rake_events (
  id uuid primary key default gen_random_uuid(),
  table_id text not null,
  hand_id uuid references poker_hands(id),
  amount_lamports numeric(40, 0) not null,
  mint text not null,
  destination text not null,
  tx_signature text,
  created_at timestamptz not null default now()
);

create table if not exists poker_private_invites (
  id uuid primary key default gen_random_uuid(),
  table_id text not null references poker_tables(table_id) on delete cascade,
  invite_code text not null unique,
  created_by text not null,
  max_uses integer,
  uses integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists poker_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists poker_compliance_events (
  id uuid primary key default gen_random_uuid(),
  wallet text,
  event_type text not null,
  region text,
  ip_hash text,
  device_hash text,
  risk_score integer,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists poker_actions_hand_sequence_idx on poker_actions(hand_id, sequence_number);
create index if not exists poker_hands_table_number_idx on poker_hands(table_id, hand_number);
create index if not exists poker_compliance_wallet_idx on poker_compliance_events(wallet, created_at desc);

