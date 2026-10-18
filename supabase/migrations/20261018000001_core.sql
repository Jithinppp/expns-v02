-- Expns · 01 · core
-- profiles, accounts, categories + signup seeding + RLS.
-- Run first in the Supabase SQL Editor.

-- ---------------------------------------------------------------- helpers

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- profiles

create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text,
  base_currency  text not null default 'USD' check (char_length(base_currency) between 3 and 8),
  timezone       text not null default 'UTC',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- accounts

create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 60),
  kind            text not null default 'cash' check (kind in ('cash', 'bank', 'credit_card', 'wallet')),
  opening_balance numeric(14,2) not null default 0,
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists accounts_user_idx on public.accounts (user_id);

alter table public.accounts enable row level security;

drop policy if exists "accounts own rows" on public.accounts;
create policy "accounts own rows" on public.accounts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists accounts_touch on public.accounts;
create trigger accounts_touch
  before update on public.accounts
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- categories

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  kind        text not null check (kind in ('income', 'expense')),
  icon        text,
  color       text,
  sort_order  int not null default 0,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, name, kind)
);

create index if not exists categories_user_kind_idx on public.categories (user_id, kind);

alter table public.categories enable row level security;

drop policy if exists "categories own rows" on public.categories;
create policy "categories own rows" on public.categories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists categories_touch on public.categories;
create trigger categories_touch
  before update on public.categories
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- signup seeding

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, base_currency, timezone)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'currency', ''), 'USD'),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC')
  )
  on conflict (id) do nothing;

  insert into public.accounts (user_id, name, kind, opening_balance)
  values (new.id, 'Cash', 'cash', 0);

  insert into public.categories (user_id, name, kind, icon, sort_order)
  values
    (new.id, 'Salary',        'income',  '💼', 1),
    (new.id, 'Other income',  'income',  '✨', 2),
    (new.id, 'Food & dining', 'expense', '🍔', 1),
    (new.id, 'Groceries',     'expense', '🛒', 2),
    (new.id, 'Transport',     'expense', '🚗', 3),
    (new.id, 'Housing',       'expense', '🏠', 4),
    (new.id, 'Utilities',     'expense', '💡', 5),
    (new.id, 'Shopping',      'expense', '🛍️', 6),
    (new.id, 'Health',        'expense', '💊', 7),
    (new.id, 'Entertainment', 'expense', '🎬', 8),
    (new.id, 'Other',         'expense', '📦', 9)
  on conflict do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- grants

grant select, insert, update, delete on public.profiles, public.accounts, public.categories to authenticated;
