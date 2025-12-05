-- Ensure at most one active wager per lobby per wallet
-- Active = status in ('submitted','locked')

create unique index if not exists uq_wager_one_active_per_lobby
on wager_events(lobby_id, wallet_address)
where status in ('submitted','locked');


