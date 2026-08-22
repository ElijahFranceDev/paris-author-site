-- Dispatcher tracking for each load
alter table public.loads
  add column if not exists dispatcher_name text,
  add column if not exists dispatcher_fee_percent numeric(5,2) default 0
    check (dispatcher_fee_percent >= 0 and dispatcher_fee_percent <= 100);
