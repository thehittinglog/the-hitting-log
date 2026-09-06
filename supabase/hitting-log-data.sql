create table if not exists public.hitting_log_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  athlete_name text not null default '',
  sport_type text not null default 'baseball' check (sport_type in ('baseball', 'softball')),
  handedness text check (handedness in ('right', 'left')),
  date_of_birth date,
  guardian_permission_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hitting_log_games (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create index if not exists hitting_log_games_user_updated_idx
on public.hitting_log_games (user_id, updated_at desc);

alter table public.hitting_log_profiles enable row level security;
alter table public.hitting_log_games enable row level security;

revoke all on table public.hitting_log_profiles from anon;
revoke all on table public.hitting_log_games from anon;
grant select, insert, update, delete on table public.hitting_log_profiles to authenticated;
grant select, insert, update, delete on table public.hitting_log_games to authenticated;

drop policy if exists "Users can select their own hitting log profile" on public.hitting_log_profiles;
drop policy if exists "Users can insert their own hitting log profile" on public.hitting_log_profiles;
drop policy if exists "Users can update their own hitting log profile" on public.hitting_log_profiles;
drop policy if exists "Users can delete their own hitting log profile" on public.hitting_log_profiles;

create policy "Users can select their own hitting log profile"
on public.hitting_log_profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own hitting log profile"
on public.hitting_log_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own hitting log profile"
on public.hitting_log_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own hitting log profile"
on public.hitting_log_profiles for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can select their own hitting log games" on public.hitting_log_games;
drop policy if exists "Users can insert their own hitting log games" on public.hitting_log_games;
drop policy if exists "Users can update their own hitting log games" on public.hitting_log_games;
drop policy if exists "Users can delete their own hitting log games" on public.hitting_log_games;

create policy "Users can select their own hitting log games"
on public.hitting_log_games for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own hitting log games"
on public.hitting_log_games for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own hitting log games"
on public.hitting_log_games for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own hitting log games"
on public.hitting_log_games for delete to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.enforce_hitting_log_free_game_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_game_count integer;
  membership_plan text;
  membership_status text;
begin
  if exists (
    select 1
    from public.hitting_log_games
    where user_id = new.user_id and game_id = new.game_id
  ) then
    return new;
  end if;

  select plan, subscription_status
  into membership_plan, membership_status
  from public.subscriptions
  where user_id = new.user_id;

  if membership_plan in ('pro', 'pro_plus')
    and membership_status in ('active', 'trialing') then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

  select count(*)
  into saved_game_count
  from public.hitting_log_games
  where user_id = new.user_id;

  if saved_game_count >= 10 then
    raise exception using
      errcode = 'P0001',
      message = 'FREE_GAME_LIMIT_REACHED',
      detail = 'Free memberships can save up to 10 games. Existing games remain available.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_hitting_log_free_game_limit() from public;

drop trigger if exists enforce_hitting_log_free_game_limit on public.hitting_log_games;

create trigger enforce_hitting_log_free_game_limit
before insert on public.hitting_log_games
for each row execute function public.enforce_hitting_log_free_game_limit();

comment on table public.hitting_log_profiles is
  'Cloud-first athlete profile data owned by one authenticated Supabase user.';

comment on table public.hitting_log_games is
  'Cloud-first games; payload contains the existing tournament, at-bat, pitch, spray, heat-map, and calculated-stat shape. New inserts enforce the trusted Free 10-game limit.';
