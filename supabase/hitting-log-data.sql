create table if not exists public.hitting_log_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  athlete_name text not null default '',
  sport_type text not null default 'baseball' check (sport_type in ('baseball', 'softball')),
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

comment on table public.hitting_log_profiles is
  'Cloud-first athlete profile data owned by one authenticated Supabase user.';

comment on table public.hitting_log_games is
  'Cloud-first games; payload contains the existing tournament, at-bat, pitch, spray, heat-map, and calculated-stat shape.';
