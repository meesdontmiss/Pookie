-- Pookie Poker Neon schema.
-- Backend-custodied hot/cold wallet architecture. No Solana smart contracts.
-- Use a Neon pooled connection string for app traffic:
-- postgresql://USER:PASSWORD@...-pooler.REGION.aws.neon.tech/DB?sslmode=require&channel_binding=require

create extension if not exists pgcrypto;

create table if not exists poker_tables (
  id uuid primary key default gen_random_uuid(),
  table_id text not null unique,
  creator_wallet text,
  table_type text not null check (table_type in ('public', 'private')),
  game_type text not null default 'texas_holdem',
  currency_mint text not null default 'SOL',
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
  settlement_reference text,
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

-- Custody ledger ---------------------------------------------------------------
-- No private keys are stored here. Hot-wallet private key material belongs in a
-- KMS/HSM or encrypted env secret. Cold wallet is public-address-only.
-- Ledger direction follows double-entry sides. A deposit debits the hot-wallet
-- asset account and credits the player liability account; table buy-ins and hand
-- settlements move liability between player/table accounts.

create table if not exists poker_custody_wallets (
  id uuid primary key default gen_random_uuid(),
  wallet_role text not null check (wallet_role in ('hot', 'cold', 'rake', 'sweep')),
  chain text not null default 'solana',
  mint text not null default 'SOL',
  address text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'retired')),
  max_hot_balance_lamports numeric(40, 0),
  min_hot_balance_lamports numeric(40, 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (wallet_role, chain, mint, address)
);

create table if not exists poker_custody_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('player', 'table', 'house', 'rake', 'cold_storage', 'hot_wallet')),
  owner_id text not null,
  mint text not null default 'SOL',
  status text not null default 'active' check (status in ('active', 'frozen', 'closed')),
  created_at timestamptz not null default now(),
  unique (owner_type, owner_id, mint)
);

create table if not exists poker_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null,
  account_id uuid not null references poker_custody_accounts(id),
  direction text not null check (direction in ('debit', 'credit')),
  amount_lamports numeric(40, 0) not null check (amount_lamports > 0),
  entry_type text not null,
  reference_type text,
  reference_id text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists poker_deposits (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  amount_lamports numeric(40, 0) not null check (amount_lamports > 0),
  mint text not null default 'SOL',
  chain text not null default 'solana',
  source_address text,
  hot_wallet_address text not null,
  tx_signature text not null unique,
  confirmations integer not null default 0,
  status text not null check (status in ('pending', 'confirmed', 'credited', 'rejected')),
  credited_transaction_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists poker_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  destination_address text not null,
  amount_lamports numeric(40, 0) not null check (amount_lamports > 0),
  mint text not null default 'SOL',
  status text not null check (status in ('requested', 'approved', 'broadcast', 'confirmed', 'rejected', 'cancelled')),
  risk_score integer not null default 0,
  requested_by text not null,
  approved_by text,
  tx_signature text unique,
  ledger_transaction_id uuid,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists poker_wallet_sweeps (
  id uuid primary key default gen_random_uuid(),
  from_wallet_id uuid not null references poker_custody_wallets(id),
  to_wallet_id uuid not null references poker_custody_wallets(id),
  amount_lamports numeric(40, 0) not null check (amount_lamports > 0),
  mint text not null default 'SOL',
  status text not null check (status in ('planned', 'approved', 'broadcast', 'confirmed', 'failed', 'cancelled')),
  tx_signature text unique,
  created_by text not null,
  approved_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists poker_actions_hand_sequence_idx on poker_actions(hand_id, sequence_number);
create index if not exists poker_hands_table_number_idx on poker_hands(table_id, hand_number);
create index if not exists poker_compliance_wallet_idx on poker_compliance_events(wallet, created_at desc);
create index if not exists poker_ledger_transaction_idx on poker_ledger_entries(transaction_id);
create index if not exists poker_ledger_account_idx on poker_ledger_entries(account_id, created_at desc);
create index if not exists poker_deposits_wallet_idx on poker_deposits(wallet, created_at desc);
create index if not exists poker_withdrawals_wallet_idx on poker_withdrawal_requests(wallet, created_at desc);

-- Double-entry invariant helper. Use after inserts in tests/jobs:
-- select transaction_id
-- from poker_ledger_entries
-- group by transaction_id
-- having sum(case direction when 'credit' then amount_lamports else -amount_lamports end) <> 0;
