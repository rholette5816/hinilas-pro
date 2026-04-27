alter table public.user_data
  add column if not exists feedback_prompt_shown_at timestamptz;

alter table public.email_log
  add column if not exists created_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'email_log'
      and column_name = 'sent_at'
  ) then
    update public.email_log
    set created_at = coalesce(created_at, sent_at, now())
    where created_at is null;
  else
    update public.email_log
    set created_at = coalesce(created_at, now())
    where created_at is null;
  end if;
end $$;

alter table public.email_log
  alter column created_at set default now();

alter table public.email_log
  alter column created_at set not null;

create index if not exists idx_email_log_created_at
  on public.email_log (created_at);
