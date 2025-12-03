-- Account activity/audit log (join/leave/ready/wager/refund/payout/login/etc.)
-- Safe to re-run

create table if not exists account_activity (
  id uuid primary key default gen_random_uuid(),
  wallet_address text,
  guest_id text,
  action text not null,      -- e.g., 'join_lobby','leave_lobby','set_ready','wager_submitted','refund','payout','login'
  lobby_id text,
  match_id text,
  metadata jsonb,            -- flexible payload, e.g., { "amount": 0.1, "tx": "..." }
  created_at timestamptz default now()
);

create index if not exists idx_activity_wallet on account_activity(wallet_address);
create index if not exists idx_activity_guest on account_activity(guest_id);
create index if not exists idx_activity_action on account_activity(action);
create index if not exists idx_activity_time on account_activity(created_at desc);
create index if not exists idx_activity_lobby on account_activity(lobby_id);


