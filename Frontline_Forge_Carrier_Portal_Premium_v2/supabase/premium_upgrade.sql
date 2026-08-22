-- Frontline Forge Solutions Carrier Command Portal Premium v2
-- Run once in Supabase SQL Editor after backing up your project.

create extension if not exists pgcrypto;

alter type public.portal_role add value if not exists 'dispatcher';
alter type public.portal_role add value if not exists 'driver';

alter table public.carriers add column if not exists address_line1 text;
alter table public.carriers add column if not exists city text;
alter table public.carriers add column if not exists state text;
alter table public.carriers add column if not exists postal_code text;
alter table public.carriers add column if not exists billing_email text;
alter table public.carriers add column if not exists notification_email text;
alter table public.carriers add column if not exists portal_plan text not null default 'premium';
alter table public.carriers add column if not exists weekly_report_enabled boolean not null default true;
alter table public.carriers add column if not exists monthly_report_enabled boolean not null default true;
alter table public.carriers add column if not exists notes text;
alter table public.carriers add column if not exists updated_at timestamptz not null default now();

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists status text not null default 'active';
alter table public.profiles add column if not exists permissions jsonb not null default '{}'::jsonb;

alter table public.loads add column if not exists broker_load_number text;
alter table public.loads add column if not exists commodity text;
alter table public.loads add column if not exists weight numeric(12,2);
alter table public.loads add column if not exists equipment_type text;
alter table public.loads add column if not exists pickup_time time;
alter table public.loads add column if not exists delivery_time time;
alter table public.loads add column if not exists shipper_name text;
alter table public.loads add column if not exists receiver_name text;
alter table public.loads add column if not exists miles_loaded numeric(12,2) not null default 0;
alter table public.loads add column if not exists miles_deadhead numeric(12,2) not null default 0;
alter table public.loads add column if not exists fuel_cost numeric(12,2) not null default 0;
alter table public.loads add column if not exists tolls numeric(12,2) not null default 0;
alter table public.loads add column if not exists lumper numeric(12,2) not null default 0;
alter table public.loads add column if not exists detention numeric(12,2) not null default 0;
alter table public.loads add column if not exists layover numeric(12,2) not null default 0;
alter table public.loads add column if not exists tonu numeric(12,2) not null default 0;
alter table public.loads add column if not exists other_accessorials numeric(12,2) not null default 0;
alter table public.loads add column if not exists invoice_status text not null default 'not_invoiced';
alter table public.loads add column if not exists payment_status text not null default 'pending';
alter table public.loads add column if not exists delivered_at timestamptz;

create table if not exists public.trucks (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.carriers(id) on delete cascade,
  unit_number text not null,
  equipment_type text not null,
  year integer,
  make text,
  model text,
  vin_last6 text,
  capacity_lbs numeric(12,2),
  plate_number text,
  insurance_expires_on date,
  registration_expires_on date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(carrier_id, unit_number)
);

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references public.carriers(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  assigned_truck_id uuid references public.trucks(id) on delete set null,
  cdl_number text,
  cdl_expires_on date,
  medical_card_expires_on date,
  emergency_contact text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.loads add column if not exists truck_id uuid references public.trucks(id) on delete set null;
alter table public.loads add column if not exists driver_id uuid references public.drivers(id) on delete set null;

alter table public.documents add column if not exists expires_on date;
alter table public.documents add column if not exists uploaded_by uuid references public.profiles(id) on delete set null;
alter table public.documents add column if not exists visibility text not null default 'carrier';
alter table public.documents add column if not exists status text not null default 'active';
alter table public.documents add column if not exists updated_at timestamptz not null default now();

create table if not exists public.fuel_entries (
  id uuid primary key default gen_random_uuid(), carrier_id uuid not null references public.carriers(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete set null, truck_id uuid references public.trucks(id) on delete set null,
  load_id uuid references public.loads(id) on delete set null, entry_date date not null, vendor text, city text, state text,
  gallons numeric(12,3) not null default 0, price_per_gallon numeric(12,3) not null default 0, amount numeric(12,2) not null default 0,
  odometer numeric(12,1), notes text, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);

create table if not exists public.mileage_entries (
  id uuid primary key default gen_random_uuid(), carrier_id uuid not null references public.carriers(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete set null, truck_id uuid references public.trucks(id) on delete set null,
  load_id uuid references public.loads(id) on delete set null, entry_date date not null, start_location text, end_location text,
  loaded_miles numeric(12,2) not null default 0, deadhead_miles numeric(12,2) not null default 0, personal_miles numeric(12,2) not null default 0,
  notes text, created_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(), carrier_id uuid not null references public.carriers(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null, assigned_to uuid references public.profiles(id) on delete set null,
  load_id uuid references public.loads(id) on delete set null, category text not null, subject text not null, description text not null,
  priority text not null default 'normal', status text not null default 'New', resolution_notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(), carrier_id uuid not null references public.carriers(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null, load_id uuid references public.loads(id) on delete set null,
  action text not null, entity_type text not null, entity_id uuid, details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), carrier_id uuid not null references public.carriers(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade, title text not null, message text not null,
  notification_type text not null default 'general', link text, read_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(), carrier_id uuid not null references public.carriers(id) on delete cascade,
  report_type text not null, period_start date not null, period_end date not null, title text not null, storage_path text not null,
  total_loads integer not null default 0, gross_revenue numeric(12,2) not null default 0, fee_total numeric(12,2) not null default 0,
  total_loaded_miles numeric(12,2) not null default 0, total_deadhead_miles numeric(12,2) not null default 0, fuel_cost numeric(12,2) not null default 0,
  generated_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(), carrier_id uuid not null references public.carriers(id) on delete cascade,
  invoice_number text not null unique, period_start date not null, period_end date not null, issue_date date not null, due_date date not null,
  subtotal numeric(12,2) not null default 0, total numeric(12,2) not null default 0, status text not null default 'open', storage_path text,
  payment_reference text, paid_at timestamptz, generated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(), invoice_id uuid not null references public.invoices(id) on delete cascade,
  load_id uuid references public.loads(id) on delete set null, description text not null, load_rate numeric(12,2) not null default 0,
  fee_rate numeric(5,4) not null default 0, amount numeric(12,2) not null default 0, created_at timestamptz not null default now()
);

create or replace function public.current_role() returns text language sql stable security definer set search_path=public as $$ select role::text from public.profiles where id=auth.uid(); $$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$ select coalesce(public.current_role() in ('admin','dispatcher'),false); $$;
create or replace function public.current_driver_id() returns uuid language sql stable security definer set search_path=public as $$ select id from public.drivers where user_id=auth.uid(); $$;
create or replace function public.can_access_carrier(target uuid) returns boolean language sql stable security definer set search_path=public as $$ select public.is_staff() or target=public.current_carrier_id(); $$;
create or replace function public.can_access_load(target_carrier uuid, target_driver uuid) returns boolean language sql stable security definer set search_path=public as $$
  select public.is_staff() or (public.current_role()='carrier_owner' and target_carrier=public.current_carrier_id()) or (public.current_role()='driver' and target_carrier=public.current_carrier_id() and target_driver=public.current_driver_id());
$$;

alter table public.trucks enable row level security; alter table public.drivers enable row level security; alter table public.fuel_entries enable row level security;
alter table public.mileage_entries enable row level security; alter table public.support_requests enable row level security; alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security; alter table public.reports enable row level security; alter table public.invoices enable row level security; alter table public.invoice_lines enable row level security;

-- Refresh core policies for expanded roles.

-- Refresh carrier and profile visibility for staff roles.
drop policy if exists "profiles self or admin" on public.profiles;
drop policy if exists "profiles self or staff" on public.profiles;
create policy "profiles self or staff" on public.profiles for select to authenticated using (id=auth.uid() or public.is_staff());
drop policy if exists "carriers read own or admin" on public.carriers;
drop policy if exists "carriers premium read" on public.carriers;
create policy "carriers premium read" on public.carriers for select to authenticated using (public.is_staff() or id=public.current_carrier_id());
drop policy if exists "loads read own or admin" on public.loads;
drop policy if exists "loads premium read" on public.loads;
create policy "loads premium read" on public.loads for select to authenticated using (public.can_access_load(carrier_id, driver_id));
drop policy if exists "loads admin write" on public.loads;
drop policy if exists "loads staff write" on public.loads;
create policy "loads staff write" on public.loads for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "documents read own or admin" on public.documents;
drop policy if exists "documents premium read" on public.documents;
create policy "documents premium read" on public.documents for select to authenticated using (public.is_staff() or (carrier_id=public.current_carrier_id() and (public.current_role()='carrier_owner' or load_id is null or exists(select 1 from public.loads l where l.id=load_id and l.driver_id=public.current_driver_id()))));
drop policy if exists "documents admin write" on public.documents;
drop policy if exists "documents premium insert" on public.documents;
create policy "documents premium insert" on public.documents for insert to authenticated with check (public.is_staff() or carrier_id=public.current_carrier_id());
drop policy if exists "documents staff update" on public.documents;
create policy "documents staff update" on public.documents for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists "documents staff delete" on public.documents;
create policy "documents staff delete" on public.documents for delete to authenticated using (public.is_staff());

drop policy if exists "trucks carrier access" on public.trucks;
create policy "trucks carrier access" on public.trucks for select to authenticated using (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id()) or (public.current_role()='driver' and id=(select assigned_truck_id from public.drivers where user_id=auth.uid())));
drop policy if exists "trucks owner or staff insert" on public.trucks;
create policy "trucks owner or staff insert" on public.trucks for insert to authenticated with check (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id()));
drop policy if exists "trucks owner or staff update" on public.trucks;
create policy "trucks owner or staff update" on public.trucks for update to authenticated using (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id())) with check (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id()));

drop policy if exists "drivers carrier access" on public.drivers;
create policy "drivers carrier access" on public.drivers for select to authenticated using (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id()) or user_id=auth.uid());
drop policy if exists "drivers staff write" on public.drivers;
create policy "drivers staff write" on public.drivers for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "fuel carrier access" on public.fuel_entries;
create policy "fuel carrier access" on public.fuel_entries for select to authenticated using (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id()) or driver_id=public.current_driver_id());
drop policy if exists "fuel carrier insert" on public.fuel_entries;
create policy "fuel carrier insert" on public.fuel_entries for insert to authenticated with check (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id()) or (public.current_role()='driver' and carrier_id=public.current_carrier_id() and (driver_id is null or driver_id=public.current_driver_id())));
drop policy if exists "fuel owner staff update" on public.fuel_entries;
create policy "fuel owner staff update" on public.fuel_entries for update to authenticated using (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id())) with check (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id()));

drop policy if exists "mileage carrier access" on public.mileage_entries;
create policy "mileage carrier access" on public.mileage_entries for select to authenticated using (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id()) or driver_id=public.current_driver_id());
drop policy if exists "mileage carrier insert" on public.mileage_entries;
create policy "mileage carrier insert" on public.mileage_entries for insert to authenticated with check (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id()) or (public.current_role()='driver' and carrier_id=public.current_carrier_id() and (driver_id is null or driver_id=public.current_driver_id())));
drop policy if exists "mileage owner staff update" on public.mileage_entries;
create policy "mileage owner staff update" on public.mileage_entries for update to authenticated using (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id())) with check (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id()));

drop policy if exists "support carrier access" on public.support_requests;
create policy "support carrier access" on public.support_requests for select to authenticated using (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id()) or created_by=auth.uid());
drop policy if exists "support carrier insert" on public.support_requests;
create policy "support carrier insert" on public.support_requests for insert to authenticated with check (public.is_staff() or carrier_id=public.current_carrier_id());
drop policy if exists "support staff update" on public.support_requests;
create policy "support staff update" on public.support_requests for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "activity carrier access" on public.activity_logs;
create policy "activity carrier access" on public.activity_logs for select to authenticated using (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id()) or actor_id=auth.uid() or exists(select 1 from public.loads l where l.id=load_id and l.driver_id=public.current_driver_id()));
drop policy if exists "notifications carrier access" on public.notifications;
create policy "notifications carrier access" on public.notifications for select to authenticated using ((public.is_staff() or carrier_id=public.current_carrier_id()) and (user_id is null or user_id=auth.uid()));
drop policy if exists "reports carrier access" on public.reports;
create policy "reports carrier access" on public.reports for select to authenticated using (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id()));
drop policy if exists "invoices carrier access" on public.invoices;
create policy "invoices carrier access" on public.invoices for select to authenticated using (public.is_staff() or (public.current_role()='carrier_owner' and carrier_id=public.current_carrier_id()));
drop policy if exists "invoice lines carrier access" on public.invoice_lines;
create policy "invoice lines carrier access" on public.invoice_lines for select to authenticated using (exists(select 1 from public.invoices i where i.id=invoice_id and (public.is_staff() or (public.current_role()='carrier_owner' and i.carrier_id=public.current_carrier_id()))));

-- Storage: authenticated carrier users may upload into their own carrier folder; staff may manage all.
drop policy if exists "carrier documents admin insert" on storage.objects;
drop policy if exists "carrier documents premium insert" on storage.objects;
create policy "carrier documents premium insert" on storage.objects for insert to authenticated with check (bucket_id='carrier-documents' and (public.is_staff() or (storage.foldername(name))[1]=public.current_carrier_id()::text));
drop policy if exists "carrier documents read own or admin" on storage.objects;
drop policy if exists "carrier documents premium read" on storage.objects;
create policy "carrier documents premium read" on storage.objects for select to authenticated using (bucket_id='carrier-documents' and (public.is_staff() or (storage.foldername(name))[1]=public.current_carrier_id()::text));

-- Realtime publication for live portal refresh.
do $$ declare t text; begin
  foreach t in array array['loads','documents','notifications','support_requests','fuel_entries','mileage_entries','invoices','reports','activity_logs'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

create index if not exists idx_loads_carrier_dates on public.loads(carrier_id,date_booked);
create index if not exists idx_documents_carrier_expiry on public.documents(carrier_id,expires_on);
create index if not exists idx_fuel_carrier_date on public.fuel_entries(carrier_id,entry_date);
create index if not exists idx_mileage_carrier_date on public.mileage_entries(carrier_id,entry_date);
create index if not exists idx_support_carrier_status on public.support_requests(carrier_id,status);
create index if not exists idx_activity_carrier_date on public.activity_logs(carrier_id,created_at desc);
create index if not exists idx_notifications_carrier_date on public.notifications(carrier_id,created_at desc);

update public.carriers set notification_email=coalesce(notification_email,email), billing_email=coalesce(billing_email,email), portal_plan=coalesce(portal_plan,'premium');
