create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text not null default 'inactive',
  stripe_price_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions
add column if not exists current_period_start timestamptz;

alter table public.subscriptions enable row level security;

revoke all on table public.subscriptions from anon;
revoke insert, update, delete on table public.subscriptions from authenticated;
grant select on table public.subscriptions to authenticated;
grant select, insert, update, delete on table public.subscriptions to service_role;

drop policy if exists "Users can view their own subscription" on public.subscriptions;

create policy "Users can view their own subscription"
on public.subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

comment on table public.subscriptions is
  'Stripe subscription state synchronized by the verified server-side webhook.';
