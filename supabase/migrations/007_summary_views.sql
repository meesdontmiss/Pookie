-- Helpful views for dashboards/analytics

create or replace view vw_player_wlt as
select
  wallet_address as wallet,
  coalesce(total_wins, 0) as total_wins,
  coalesce(total_losses, 0) as total_losses,
  coalesce(total_matches, 0) as total_matches,
  coalesce(total_winnings, 0) as total_winnings,
  coalesce(total_wagered, 0) as total_wagered,
  last_match_at
from player_stats;

create or replace view vw_recent_transactions as
select
  t.id,
  t.wallet_address,
  t.transaction_type,
  t.amount,
  t.related_entity_id,
  t.tx_signature,
  t.created_at
from transactions t
order by t.created_at desc;


