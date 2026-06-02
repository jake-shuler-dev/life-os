-- Life OS — run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Creates the table that holds your app data and locks every row to its owner.

create table if not exists public.app_data (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      text,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.app_data enable row level security;

-- Each signed-in user can only read/write their own rows.
drop policy if exists "own rows" on public.app_data;
create policy "own rows" on public.app_data
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
