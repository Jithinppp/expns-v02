-- Expns · 06 · delete your own account
-- Run after 05_month_carryover (or on its own). Powers Profile → Delete
-- account — Google Play requires an in-app way to delete your account.
-- Deleting the auth user is enough: every table references auth.users with
-- on delete cascade. Safe to re-run.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
