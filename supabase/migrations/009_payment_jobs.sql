-- Payment/refund job queue for retries and durability

create table if not exists payment_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null, -- payout | refund
  payload jsonb not null,
  status text not null default 'pending', -- pending | processing | completed | failed
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  processed_at timestamptz
);

create index if not exists idx_payment_jobs_status on payment_jobs(status, created_at);

drop trigger if exists trg_payment_jobs_updated_at on payment_jobs;
create trigger trg_payment_jobs_updated_at
  before update on payment_jobs
  for each row execute function set_updated_at();

