-- Expns · 02 · ledger
-- recurring_rules + transactions. Run after 01_core.

-- ---------------------------------------------------------------- recurring rules

create table if not exists public.recurring_rules (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id     uuid not null references public.accounts (id) on delete cascade,
  category_id    uuid references public.categories (id) on delete set null,
  type           text not null check (type in ('income', 'expense')),
  amount         numeric(14,2) not null check (amount > 0),
  frequency      text not null default 'monthly' check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  interval_count int not null default 1 check (interval_count between 1 and 12),
  start_on       date not null default current_date,
  next_run_on    date not null,
  note           text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists recurring_due_idx
  on public.recurring_rules (next_run_on)
  where is_active;

alter table public.recurring_rules enable row level security;

drop policy if exists "recurring_rules own rows" on public.recurring_rules;
create policy "recurring_rules own rows" on public.recurring_rules
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists recurring_rules_touch on public.recurring_rules;
create trigger recurring_rules_touch
  before update on public.recurring_rules
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- transactions

create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  account_id    uuid not null references public.accounts (id) on delete restrict,
  to_account_id uuid references public.accounts (id) on delete restrict,
  category_id   uuid references public.categories (id) on delete set null,
  recurring_id  uuid references public.recurring_rules (id) on delete set null,
  type          text not null check (type in ('income', 'expense', 'transfer')),
  amount        numeric(14,2) not null check (amount > 0),
  occurred_on   date not null default current_date,
  note          text,
  merchant      text,
  external_id   text,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint transfer_needs_target check (
    (type = 'transfer' and to_account_id is not null) or
    (type <> 'transfer' and to_account_id is null)
  )
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, occurred_on desc)
  where deleted_at is null;

create index if not exists transactions_user_category_idx
  on public.transactions (user_id, category_id, occurred_on desc)
  where deleted_at is null;

create unique index if not exists transactions_external_idx
  on public.transactions (user_id, external_id)
  where external_id is not null;

alter table public.transactions enable row level security;

drop policy if exists "transactions own rows" on public.transactions;
create policy "transactions own rows" on public.transactions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists transactions_touch on public.transactions;
create trigger transactions_touch
  before update on public.transactions
  for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.recurring_rules, public.transactions to authenticated;
