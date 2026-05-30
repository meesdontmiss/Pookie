-- Enable Row Level Security on app tables.
-- Safe to re-run: policies are dropped/recreated with the intended access model.
--
-- Principle:
-- - Service role gets full server-side access.
-- - Browser anon key can read public lobby/history/profile/chat data where the app needs it.
-- - Browser anon key cannot read or write escrow, wager, payment, or audit internals.

-- escrow_state: service_role only
alter table if exists public.escrow_state enable row level security;
drop policy if exists "Service role full access on escrow_state" on public.escrow_state;
create policy "Service role full access on escrow_state"
  on public.escrow_state for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- payment_jobs: service_role only
alter table if exists public.payment_jobs enable row level security;
drop policy if exists "Service role full access on payment_jobs" on public.payment_jobs;
create policy "Service role full access on payment_jobs"
  on public.payment_jobs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- wager_events: service_role only
alter table if exists public.wager_events enable row level security;
drop policy if exists "Service role full access on wager_events" on public.wager_events;
create policy "Service role full access on wager_events"
  on public.wager_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- account_activity: service_role only
alter table if exists public.account_activity enable row level security;
drop policy if exists "Service role full access on account_activity" on public.account_activity;
create policy "Service role full access on account_activity"
  on public.account_activity for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- transactions: public read, service_role write
alter table if exists public.transactions enable row level security;
drop policy if exists "Service role full access on transactions" on public.transactions;
drop policy if exists "Anon can read transactions (public leaderboard)" on public.transactions;
create policy "Service role full access on transactions"
  on public.transactions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "Anon can read transactions (public leaderboard)"
  on public.transactions for select
  using (true);

-- match_results: public read, service_role write
alter table if exists public.match_results enable row level security;
drop policy if exists "Service role full access on match_results" on public.match_results;
drop policy if exists "Anon can read match_results" on public.match_results;
create policy "Service role full access on match_results"
  on public.match_results for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "Anon can read match_results"
  on public.match_results for select
  using (true);

-- player_stats: public read, service_role write
alter table if exists public.player_stats enable row level security;
drop policy if exists "Service role full access on player_stats" on public.player_stats;
drop policy if exists "Anon can read player_stats (leaderboard)" on public.player_stats;
create policy "Service role full access on player_stats"
  on public.player_stats for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "Anon can read player_stats (leaderboard)"
  on public.player_stats for select
  using (true);

-- lobbies: public read, service_role write
alter table if exists public.lobbies enable row level security;
drop policy if exists "Service role full access on lobbies" on public.lobbies;
drop policy if exists "Anon can read lobbies" on public.lobbies;
create policy "Service role full access on lobbies"
  on public.lobbies for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "Anon can read lobbies"
  on public.lobbies for select
  using (true);

-- lobby_players: public read for roster display, service_role write
alter table if exists public.lobby_players enable row level security;
drop policy if exists "Service role full access on lobby_players" on public.lobby_players;
drop policy if exists "Anon can read lobby_players" on public.lobby_players;
create policy "Service role full access on lobby_players"
  on public.lobby_players for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "Anon can read lobby_players"
  on public.lobby_players for select
  using (true);

-- match_state: public read for history/current match display, service_role write
alter table if exists public.match_state enable row level security;
drop policy if exists "Service role full access on match_state" on public.match_state;
drop policy if exists "Anon can read match_state" on public.match_state;
create policy "Service role full access on match_state"
  on public.match_state for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "Anon can read match_state"
  on public.match_state for select
  using (true);

-- profiles: public read, service_role write
alter table if exists public.profiles enable row level security;
drop policy if exists "Service role full access on profiles" on public.profiles;
drop policy if exists "Anon can read profiles" on public.profiles;
create policy "Service role full access on profiles"
  on public.profiles for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "Anon can read profiles"
  on public.profiles for select
  using (true);

-- chat_rooms: public read, service_role write
alter table if exists public.chat_rooms enable row level security;
drop policy if exists "Service role full access on chat_rooms" on public.chat_rooms;
drop policy if exists "Anon can read chat_rooms" on public.chat_rooms;
create policy "Service role full access on chat_rooms"
  on public.chat_rooms for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "Anon can read chat_rooms"
  on public.chat_rooms for select
  using (true);

-- chat_messages: public read, service_role write
alter table if exists public.chat_messages enable row level security;
drop policy if exists "Service role full access on chat_messages" on public.chat_messages;
drop policy if exists "Anon can read chat_messages" on public.chat_messages;
create policy "Service role full access on chat_messages"
  on public.chat_messages for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
create policy "Anon can read chat_messages"
  on public.chat_messages for select
  using (true);
