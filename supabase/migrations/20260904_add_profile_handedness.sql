alter table public.hitting_log_profiles
add column if not exists handedness text;

alter table public.hitting_log_profiles
drop constraint if exists hitting_log_profiles_handedness_check;

alter table public.hitting_log_profiles
add constraint hitting_log_profiles_handedness_check
check (handedness in ('right', 'left'));

comment on column public.hitting_log_profiles.handedness is
  'Nullable hitter handedness. Valid saved values are right and left; null means not selected.';
