-- Profiles / Usernames
-- Safe to re-run

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  solana_public_key text unique, -- base58 wallet (nullable for guests)
  guest_id text unique,          -- guest_* id (nullable for wallets)
  username text unique,          -- desired public handle (enforce case-insensitive via index below)
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Case-insensitive unique username
create unique index if not exists uq_profiles_username_ci on profiles (lower(username));
create index if not exists idx_profiles_wallet on profiles (solana_public_key);

-- Updated-at maintenance trigger
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
before update on profiles
for each row execute function set_updated_at();


