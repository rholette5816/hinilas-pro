create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target_id text,
  details jsonb,
  created_at timestamptz not null default now()
);
