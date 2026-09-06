alter table public.hitting_log_profiles
add column if not exists date_of_birth date;

alter table public.hitting_log_profiles
add column if not exists guardian_permission_confirmed_at timestamptz;

comment on column public.hitting_log_profiles.date_of_birth is
  'Nullable date of birth supplied by the account user for age-based eligibility. Existing profiles may remain null.';

comment on column public.hitting_log_profiles.guardian_permission_confirmed_at is
  'Nullable timestamp recording parent or legal guardian permission confirmation. This value is not sent to OpenAI.';
