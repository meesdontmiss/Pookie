-- Chat rooms and messages (global/lobby)
-- Safe to re-run

create table if not exists chat_rooms (
  id text primary key,             -- e.g. 'global', 'free-test-match', or generated ids
  room_type text not null default 'lobby', -- 'global' | 'lobby' | 'party' (future)
  created_at timestamptz default now()
);

-- Messages in a room
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references chat_rooms(id) on delete cascade,
  sender_wallet text,      -- base58 (nullable for guests)
  sender_guest_id text,    -- guest_* (nullable for wallets)
  sender_username text,    -- snapshot of display handle
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_chat_messages_room_time on chat_messages(room_id, created_at desc);
create index if not exists idx_chat_messages_sender on chat_messages(sender_wallet);

-- Seed a global and default lobby rooms (idempotent)
insert into chat_rooms (id, room_type) values
  ('global', 'global'),
  ('free-test-match', 'lobby')
on conflict (id) do nothing;


