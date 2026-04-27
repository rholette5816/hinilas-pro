create extension if not exists pgcrypto;

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email_type text not null,
  sent_at timestamptz not null default now()
);

create index if not exists idx_email_log_user_type on public.email_log (user_id, email_type);

alter table public.email_log enable row level security;
