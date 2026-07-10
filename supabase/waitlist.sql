create extension if not exists pgcrypto;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text unique not null,
  sport text not null,
  created_at timestamptz default now()
);

alter table public.waitlist enable row level security;

drop policy if exists "Allow public waitlist inserts" on public.waitlist;

create policy "Allow public waitlist inserts"
on public.waitlist
for insert
to anon, authenticated
with check (
  first_name is not null
  and last_name is not null
  and email is not null
  and sport in ('baseball', 'softball')
);

revoke all on table public.waitlist from anon, authenticated;
grant insert on table public.waitlist to anon, authenticated;
