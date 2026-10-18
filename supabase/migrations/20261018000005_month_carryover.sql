-- Expns · 05 · month summary gains the carry-over (main) balance
-- Run after 04_views_automation. Safe to re-run.

-- The return type changes (new column), so drop the old function first.
drop function if exists public.get_month_summary(date);

create function public.get_month_summary(p_month date default current_date)
returns table (income numeric, expense numeric, carryover numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with bounds as (
    select
      date_trunc('month', p_month)::date as start_on,
      (date_trunc('month', p_month) + interval '1 month')::date as next_on
  ),
  month_totals as (
    select
      coalesce(sum(t.amount) filter (where t.type = 'income'), 0) as income,
      coalesce(sum(t.amount) filter (where t.type = 'expense'), 0) as expense
    from public.transactions t, bounds b
    where t.deleted_at is null
      and t.occurred_on >= b.start_on
      and t.occurred_on <  b.next_on
  ),
  carried as (
    select
      -- opening balances of live accounts …
      coalesce((
        select sum(a.opening_balance)
        from public.accounts a
        where not a.is_archived
      ), 0)
      -- … plus income/expense on live accounts from before this month.
      + coalesce(sum(
          case t.type
            when 'income' then t.amount
            when 'expense' then -t.amount
            else 0
          end
        ), 0) as carryover
    from public.transactions t
    join public.accounts a on a.id = t.account_id and not a.is_archived
    cross join bounds b
    where t.deleted_at is null
      and t.type in ('income', 'expense')
      and t.occurred_on < b.start_on
  )
  select m.income::numeric, m.expense::numeric, c.carryover::numeric
  from month_totals m, carried c;
$$;

revoke execute on function public.get_month_summary(date) from public, anon;
grant execute on function public.get_month_summary(date) to authenticated;
