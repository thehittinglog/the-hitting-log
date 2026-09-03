-- Production may still have the original constraint that accepted only
-- 'free' and 'pro'. Application deploys do not execute supabase/subscriptions.sql.
alter table public.subscriptions
drop constraint if exists subscriptions_plan_check;

alter table public.subscriptions
add constraint subscriptions_plan_check
check (plan in ('free', 'pro', 'pro_plus'));
