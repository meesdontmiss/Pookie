-- Pookie Sumo Ball Economy Tables
-- Run this migration in your Supabase SQL editor

-- Match Results Table
create table if not exists match_results (
  id uuid primary key default gen_random_uuid(),
  lobby_id text not null,
  escrow_wallet_id text,
  match_started_at timestamptz not null,
  match_ended_at timestamptz,
  winner_wallet text,
  total_prize_pool numeric(12,6) not null,
  house_cut_amount numeric(12,6),
  participants jsonb not null, -- [{wallet, wager_amount, username}]
  game_data jsonb,
  status text not null default 'pending', -- pending|active|completed|cancelled
  payout_processed boolean default false,
  payout_tx_signature text,
  house_tx_signature text,
  idempotency_key text unique,
  created_at timestamptz default now()
);

create index if not exists idx_match_results_lobby on match_results(lobby_id);
create index if not exists idx_match_results_winner on match_results(winner_wallet);
create index if not exists idx_match_results_status on match_results(status);
create index if not exists idx_match_results_created on match_results(created_at desc);

-- Transactions Table
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  transaction_type text not null, -- 'wager'|'win'|'refund'|'house_cut'
  amount numeric(12,6) not null,
  related_entity_id uuid, -- match_results.id
  description text,
  tx_signature text,
  created_at timestamptz default now()
);

create index if not exists idx_transactions_wallet on transactions(wallet_address);
create index if not exists idx_transactions_type on transactions(transaction_type);
create index if not exists idx_transactions_created on transactions(created_at desc);

-- Escrow State Table (for A/B wallet rotation)
create table if not exists escrow_state (
  id serial primary key,
  active_wallet char(1) not null default 'A', -- 'A' or 'B'
  wallet_a text not null,
  wallet_b text not null,
  updated_at timestamptz default now(),
  constraint ck_active_wallet check (active_wallet in ('A','B'))
);

-- Insert initial escrow state (update these wallet addresses!)
insert into escrow_state (wallet_a, wallet_b, active_wallet)
values (
  'REPLACE_WITH_ESCROW_WALLET_A_PUBLIC_KEY',
  'REPLACE_WITH_ESCROW_WALLET_B_PUBLIC_KEY',
  'A'
)
on conflict do nothing;

-- Player Stats Table (optional - for leaderboards)
create table if not exists player_stats (
  wallet_address text primary key,
  username text,
  total_matches integer default 0,
  total_wins integer default 0,
  total_losses integer default 0,
  total_wagered numeric(12,6) default 0,
  total_winnings numeric(12,6) default 0,
  current_streak integer default 0,
  best_streak integer default 0,
  last_match_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_player_stats_wins on player_stats(total_wins desc);
create index if not exists idx_player_stats_winnings on player_stats(total_winnings desc);

-- Function to update player stats after match
create or replace function update_player_stats_after_match()
returns trigger as $$
begin
  -- Only update if match is completed
  if NEW.status = 'completed' and NEW.winner_wallet is not null then
    -- Update each participant
    declare
      participant jsonb;
    begin
      for participant in select * from jsonb_array_elements(NEW.participants)
      loop
        insert into player_stats (
          wallet_address,
          username,
          total_matches,
          total_wins,
          total_losses,
          total_wagered,
          total_winnings,
          last_match_at,
          updated_at
        )
        values (
          participant->>'wallet',
          participant->>'username',
          1,
          case when participant->>'wallet' = NEW.winner_wallet then 1 else 0 end,
          case when participant->>'wallet' != NEW.winner_wallet then 1 else 0 end,
          (participant->>'wager_amount')::numeric,
          case when participant->>'wallet' = NEW.winner_wallet then NEW.total_prize_pool - NEW.house_cut_amount else 0 end,
          NEW.match_ended_at,
          now()
        )
        on conflict (wallet_address) do update set
          total_matches = player_stats.total_matches + 1,
          total_wins = player_stats.total_wins + case when participant->>'wallet' = NEW.winner_wallet then 1 else 0 end,
          total_losses = player_stats.total_losses + case when participant->>'wallet' != NEW.winner_wallet then 1 else 0 end,
          total_wagered = player_stats.total_wagered + (participant->>'wager_amount')::numeric,
          total_winnings = player_stats.total_winnings + case when participant->>'wallet' = NEW.winner_wallet then NEW.total_prize_pool - NEW.house_cut_amount else 0 end,
          last_match_at = NEW.match_ended_at,
          updated_at = now();
      end loop;
    end;
  end if;
  return NEW;
end;
$$ language plpgsql;

-- Trigger to auto-update player stats
drop trigger if exists trigger_update_player_stats on match_results;
create trigger trigger_update_player_stats
  after insert or update on match_results
  for each row
  execute function update_player_stats_after_match();

-- Grant permissions (adjust as needed for your setup)
-- grant all on match_results to authenticated;
-- grant all on transactions to authenticated;
-- grant select on escrow_state to authenticated;
-- grant all on player_stats to authenticated;

