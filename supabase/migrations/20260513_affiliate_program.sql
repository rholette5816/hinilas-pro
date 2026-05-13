create table if not exists affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null unique,
  gcash_number text not null unique,
  gcash_name text not null,
  status text not null default 'active',
  rank text not null default 'Starter',
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
