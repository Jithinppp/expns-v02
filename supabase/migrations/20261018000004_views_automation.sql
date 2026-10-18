-- Expns · 04 · views, RPCs, recurring cron, realtime
-- Run after 03_budgets_alerts.

-- ---------------------------------------------------------------- views

create or replace view public.account_balances
with (security_invoker = true)
as
select
  a.id,
  a.user_id,
  a.name,
  a.kind,
  a.is_archived,
  a.opening_balance,
  a.opening_balance + coalesce(sum(
    case
      when t.type = 'income' then t.amount
      when t.type = 'expense' then -t.amount
      when t.type = 'transfer' and t.account_id = a.id then -t.amount
      when t.type = 'transfer' and t.to_account_id = a.id then t.amount
      else 0
    end
  ), 0) as balance
from public.accounts a
left join public.transactions t
  on t.deleted_at is null
 and (t.account_id = a.id or t.to_account_id = a.id)
group by a.id;

create or replace view public.budget_status
with (security_invoker = true)
as
select
  b.id,
  b.user_id,
  b.category_id,
  b.period,
  b.amount_limit,
  b.alert_threshold,
  b.is_active,
  b.created_at,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  coalesce(bp.spent, 0) as spent,
  bp.period_start,
  bp.period_end
from public.budgets b
left join public.categories c on c.id = b.category_id
left join public.budget_periods bp
  on bp.budget_id = b.id
 and current_date between bp.period_start and bp.period_end
where b.is_active;

grant select on public.account_balances, public.budget_status to authenticated;

-- ---------------------------------------------------------------- RPCs

create or replace function public.get_month_summary(p_month date default current_date)
returns table (income numeric, expense numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(sum(t.amount) filter (where t.type = 'income'), 0)::numeric,
    coalesce(sum(t.amount) filter (where t.type = 'expense'), 0)::numeric
  from public.transactions t
  where t.deleted_at is null
    and t.occurred_on >= date_trunc('month', p_month)::date
    and t.occurred_on <  (date_trunc('month', p_month) + interval '1 month')::date;
$$;

create or replace function public.expense_by_category(p_month date default current_date)
returns table (category_id uuid, name text, icon text, color text, total numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.category_id,
    coalesce(c.name, 'Uncategorized') as name,
    c.icon,
    c.color,
    sum(t.amount)::numeric as total
  from public.transactions t
  left join public.categories c on c.id = t.category_id
  where t.deleted_at is null
    and t.type = 'expense'
    and t.occurred_on >= date_trunc('month', p_month)::date
    and t.occurred_on <  (date_trunc('month', p_month) + interval '1 month')::date
  group by t.category_id, c.name, c.icon, c.color
  order by total desc;
$$;

revoke execute on function public.get_month_summary(date) from public, anon;
revoke execute on function public.expense_by_category(date) from public, anon;
grant execute on function public.get_month_summary(date) to authenticated;
grant execute on function public.expense_by_category(date) to authenticated;

-- ---------------------------------------------------------------- recurring auto-post

create or replace function public.post_due_recurring()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule     public.recurring_rules;
  v_run      date;
  v_guard    int;
  v_inserted int;
  v_posted   int := 0;
begin
  for v_rule in
    select *
    from public.recurring_rules
    where is_active
      and next_run_on <= current_date
    order by next_run_on
    for update skip locked
  loop
    -- Walk the anchored schedule from start_on and post every due occurrence
    -- (catches up silently if the cron hadn't run for a while). The
    -- external_id makes each occurrence idempotent.
    v_run := v_rule.start_on;
    v_guard := 0;
    v_inserted := 0;

    while v_run <= current_date and v_guard < 500 loop
      if v_run >= v_rule.next_run_on then
        insert into public.transactions
          (user_id, account_id, category_id, recurring_id, type, amount, occurred_on, note, external_id)
        values
          (v_rule.user_id, v_rule.account_id, v_rule.category_id, v_rule.id,
           v_rule.type, v_rule.amount, v_run, v_rule.note,
           v_rule.id::text || ':' || v_run::text)
        on conflict (user_id, external_id) where external_id is not null do nothing;

        if found then
          v_inserted := v_inserted + 1;
        end if;
      end if;

      v_run := (v_run + case v_rule.frequency
        when 'daily'  then make_interval(days => v_rule.interval_count)
        when 'weekly' then make_interval(weeks => v_rule.interval_count)
        when 'yearly' then make_interval(years => v_rule.interval_count)
        else               make_interval(months => v_rule.interval_count)
      end)::date;
      v_guard := v_guard + 1;
    end loop;

    -- v_run is now the first occurrence after today
    update public.recurring_rules
       set next_run_on = v_run,
           updated_at = now()
     where id = v_rule.id;

    if v_inserted > 0 then
      insert into public.notifications (user_id, kind, title, body, data)
      values (
        v_rule.user_id,
        'recurring_posted',
        'Recurring posted',
        case
          when v_inserted = 1 then format('%s %s posted automatically.', to_char(v_rule.amount, 'FM999,999,990.00'), v_rule.type)
          else format('%s recurring occurrences were posted automatically.', v_inserted)
        end,
        jsonb_build_object('rule_id', v_rule.id, 'amount', v_rule.amount, 'inserted', v_inserted)
      );
      v_posted := v_posted + v_inserted;
    end if;
  end loop;

  return v_posted;
end;
$$;

revoke execute on function public.post_due_recurring() from public, anon, authenticated;

-- Schedule daily at 01:00 UTC. Requires the pg_cron extension
-- (Dashboard -> Database -> Extensions -> pg_cron). The block below is a
-- no-op with a notice if pg_cron is not enabled yet — re-run it after enabling.
do $$
begin
  begin
    perform cron.unschedule('expns-post-recurring');
  exception
    when others then null;
  end;

  perform cron.schedule(
    'expns-post-recurring',
    '0 1 * * *',
    $cron$select public.post_due_recurring();$cron$
  );

  raise notice 'pg_cron job "expns-post-recurring" scheduled (daily 01:00 UTC).';
exception
  when others then
    raise notice 'pg_cron is not enabled — enable it in Dashboard -> Database -> Extensions, then re-run this scheduling block. (%)', sqlerrm;
end
$$;

-- ---------------------------------------------------------------- realtime

do $$
declare
  v_table text;
begin
  foreach v_table in array array['transactions', 'budget_periods', 'notifications']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = v_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end if;
  end loop;
exception
  when undefined_object then
    raise notice 'supabase_realtime publication not found — skipped.';
end
$$;
