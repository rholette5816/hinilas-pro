create table if not exists affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  gcash_number text not null unique,
  gcash_name text not null,
  status text not null default 'active',
  rank text not null default 'Partner',
  total_paid_referrals int not null default 0,
  joined_at timestamptz not null default now()
);

create table if not exists affiliate_earnings (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references affiliates(id) not null,
  from_user_id uuid references auth.users not null,
  type text not null,
  source_amount numeric not null,
  amount_earned numeric not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references affiliates(id) not null,
  user_id uuid references auth.users not null,
  amount numeric not null,
  gcash_number text not null,
  gcash_name text not null,
  status text not null default 'requested',
  requested_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists affiliate_earnings_affiliate_created_idx
  on affiliate_earnings (affiliate_id, created_at);

create index if not exists affiliate_payouts_affiliate_status_idx
  on affiliate_payouts (affiliate_id, status);

create table if not exists affiliate_overrides (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid references affiliates(id) not null,
  month text not null,
  team_topup_revenue numeric not null default 0,
  active_members int not null default 0,
  override_rate numeric not null default 0,
  amount_earned numeric not null default 0,
  override_type text not null default 'gen1',
  status text not null default 'pending',
  calculated_at timestamptz not null default now()
);

alter table affiliate_overrides
  add column if not exists override_type text not null default 'gen1';

alter table affiliate_overrides drop constraint if exists affiliate_overrides_affiliate_id_month_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'affiliate_overrides_affiliate_id_month_type_key'
  ) then
    alter table affiliate_overrides
      add constraint affiliate_overrides_affiliate_id_month_type_key unique (affiliate_id, month, override_type);
  end if;
end $$;

create index if not exists affiliate_overrides_status_idx
  on affiliate_overrides (status);
