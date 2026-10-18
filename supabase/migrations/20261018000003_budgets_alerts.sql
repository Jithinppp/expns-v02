-- Expns · 03 · budgets + alerts
-- budgets, budget_periods, notifications, device_tokens and the spend-sync
-- trigger that fires threshold / exceeded alerts. Run after 02_ledger.

-- ---------------------------------------------------------------- budgets

create table if not exists public.budgets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category_id     uuid references public.categories (id) on delete cascade,
  period          text not null default 'monthly' check (period in ('weekly', 'monthly', 'yearly')),
  amount_limit    numeric(14,2) not null check (amount_limit > 0),
  alert_threshold int not null default 80 check (alert_threshold between 1 and 100),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists budgets_active_unique
  on public.budgets (user_id, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid), period)
  where is_active;

alter table public.budgets enable row level security;

drop policy if exists "budgets own rows" on public.budgets;
create policy "budgets own rows" on public.budgets
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop trigger if exists budgets_touch on public.budgets;
create trigger budgets_touch
  before update on public.budgets
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------- periods (spend tracking)

create table if not exists public.budget_periods (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  budget_id         uuid not null references public.budgets (id) on delete cascade,
  period_start      date not null,
  period_end        date not null,
  spent             numeric(14,2) not null default 0,
  alerted_threshold boolean not null default false,
  alerted_limit     boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (budget_id, period_start)
);

create index if not exists budget_periods_user_idx on public.budget_periods (user_id, period_start desc);

alter table public.budget_periods enable row level security;

drop policy if exists "budget_periods read own" on public.budget_periods;
create policy "budget_periods read own" on public.budget_periods
  for select to authenticated
  using ((select auth.uid()) = user_id);
-- rows are written only by the security-definer helpers below

-- ---------------------------------------------------------------- notifications

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('budget_threshold', 'budget_exceeded', 'recurring_posted', 'system')),
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications read own" on public.notifications;
create policy "notifications read own" on public.notifications
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- inserts come from the security-definer helpers below only

-- ---------------------------------------------------------------- device tokens (push-ready)

create table if not exists public.device_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  token        text not null,
  platform     text not null check (platform in ('ios', 'android')),
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (user_id, token)
);

alter table public.device_tokens enable row level security;

drop policy if exists "device_tokens own rows" on public.device_tokens;
create policy "device_tokens own rows" on public.device_tokens
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------- period math

create or replace function public.period_bounds(p_period text, p_on date)
returns table (start_on date, end_on date)
language sql
immutable
as $$
  select
    case p_period
      when 'weekly' then date_trunc('week', p_on)::date
      when 'yearly' then date_trunc('year', p_on)::date
      else               date_trunc('month', p_on)::date
    end,
    (
      case p_period
        when 'weekly' then date_trunc('week', p_on) + interval '7 days'
        when 'yearly' then date_trunc('year', p_on) + interval '1 year'
        else               date_trunc('month', p_on) + interval '1 month'
      end - interval '1 day'
    )::date;
$$;

-- ---------------------------------------------------------------- spend sync + alerts

create or replace function public.adjust_budget_spend(
  p_user     uuid,
  p_category uuid,      -- null = "all expenses" budget
  p_date     date,
  p_delta    numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget  record;
  v_bounds  record;
  v_period  uuid;
  v_spent   numeric;
  v_name    text;
begin
  for v_budget in
    select b.id, b.period, b.amount_limit, b.alert_threshold
    from public.budgets b
    where b.user_id = p_user
      and b.is_active
      and b.category_id is not distinct from p_category
  loop
    select * into v_bounds from public.period_bounds(v_budget.period, p_date);

    insert into public.budget_periods (user_id, budget_id, period_start, period_end, spent)
    values (p_user, v_budget.id, v_bounds.start_on, v_bounds.end_on, 0)
    on conflict (budget_id, period_start) do nothing;

    update public.budget_periods
       set spent = greatest(spent + p_delta, 0),
           updated_at = now()
     where budget_id = v_budget.id
       and period_start = v_bounds.start_on
     returning id, spent into v_period, v_spent;

    if p_delta >= 0 then
      v_name := coalesce(
        (select c.name from public.categories c where c.id = p_category),
        'all expenses'
      );

      if v_spent >= v_budget.amount_limit then
        update public.budget_periods
           set alerted_threshold = true, alerted_limit = true
         where id = v_period and alerted_limit = false;

        if found then
          insert into public.notifications (user_id, kind, title, body, data)
          values (
            p_user,
            'budget_exceeded',
            'Budget exceeded',
            format(
              '%s: %s of %s spent (%s%%).',
              initcap(v_name),
              to_char(v_spent, 'FM999,999,990.00'),
              to_char(v_budget.amount_limit, 'FM999,999,990.00'),
              round(v_spent / v_budget.amount_limit * 100)
            ),
            jsonb_build_object('budget_id', v_budget.id, 'spent', v_spent, 'limit', v_budget.amount_limit)
          );
        end if;

      elsif v_spent >= v_budget.amount_limit * v_budget.alert_threshold / 100.0 then
        update public.budget_periods
           set alerted_threshold = true
         where id = v_period and alerted_threshold = false;

        if found then
          insert into public.notifications (user_id, kind, title, body, data)
          values (
            p_user,
            'budget_threshold',
            'Approaching budget limit',
            format(
              '%s: %s%% of your %s budget used.',
              initcap(v_name),
              round(v_spent / v_budget.amount_limit * 100),
              to_char(v_budget.amount_limit, 'FM999,999,990.00')
            ),
            jsonb_build_object('budget_id', v_budget.id, 'spent', v_spent, 'limit', v_budget.amount_limit)
          );
        end if;
      end if;

    else
      -- spending dropped back below the marks: allow alerts to fire again later
      update public.budget_periods
         set alerted_threshold = case
               when v_spent < v_budget.amount_limit * v_budget.alert_threshold / 100.0 then false
               else alerted_threshold
             end,
             alerted_limit = case
               when v_spent < v_budget.amount_limit then false
               else alerted_limit
             end
       where id = v_period;
    end if;
  end loop;
end;
$$;

create or replace function public.on_transaction_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    -- reverse the old expense first (update path)
    if tg_op = 'UPDATE' and old.type = 'expense' and old.deleted_at is null then
      perform public.adjust_budget_spend(old.user_id, old.category_id, old.occurred_on, -old.amount);
      if old.category_id is not null then
        perform public.adjust_budget_spend(old.user_id, null, old.occurred_on, -old.amount);
      end if;
    end if;

    if new.type = 'expense' and new.deleted_at is null then
      perform public.adjust_budget_spend(new.user_id, new.category_id, new.occurred_on, new.amount);
      if new.category_id is not null then
        perform public.adjust_budget_spend(new.user_id, null, new.occurred_on, new.amount);
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.type = 'expense' and old.deleted_at is null then
      perform public.adjust_budget_spend(old.user_id, old.category_id, old.occurred_on, -old.amount);
      if old.category_id is not null then
        perform public.adjust_budget_spend(old.user_id, null, old.occurred_on, -old.amount);
      end if;
    end if;
    return old;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists transactions_budget_sync on public.transactions;
create trigger transactions_budget_sync
  after insert or update or delete on public.transactions
  for each row execute function public.on_transaction_change();

-- When a budget is created mid-period, seed the current period with existing
-- spending and run the alert check once (so an already-crossed budget notifies).
create or replace function public.seed_budget_period()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bounds record;
  v_spent  numeric;
begin
  select * into v_bounds from public.period_bounds(new.period, current_date);

  select coalesce(sum(t.amount), 0)
    into v_spent
    from public.transactions t
   where t.user_id = new.user_id
     and t.type = 'expense'
     and t.deleted_at is null
     and t.occurred_on between v_bounds.start_on and v_bounds.end_on
     and (new.category_id is null or t.category_id = new.category_id);

  insert into public.budget_periods (user_id, budget_id, period_start, period_end, spent)
  values (new.user_id, new.id, v_bounds.start_on, v_bounds.end_on, v_spent)
  on conflict (budget_id, period_start) do update set spent = excluded.spent;

  perform public.adjust_budget_spend(new.user_id, new.category_id, current_date, 0);

  return new;
end;
$$;

drop trigger if exists budgets_seed_period on public.budgets;
create trigger budgets_seed_period
  after insert on public.budgets
  for each row execute function public.seed_budget_period();

-- ---------------------------------------------------------------- lockdown + grants

revoke execute on function public.adjust_budget_spend(uuid, uuid, date, numeric) from public, anon, authenticated;
revoke execute on function public.on_transaction_change() from public, anon, authenticated;
revoke execute on function public.seed_budget_period() from public, anon, authenticated;
revoke execute on function public.period_bounds(text, date) from public, anon, authenticated;

grant select, insert, update, delete on public.budgets, public.device_tokens to authenticated;
grant select, update on public.notifications to authenticated;
grant select on public.budget_periods to authenticated;
