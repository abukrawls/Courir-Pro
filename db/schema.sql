-- =====================================================================
-- Courier Pro — Skema Database Supabase (PostgreSQL)
-- Jalankan berurutan dari atas ke bawah di Supabase SQL Editor.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ===== 1. USERS =====
-- Melengkapi auth.users bawaan Supabase Auth (id sama dengan auth.users.id)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  name text not null,
  role text not null check (role in ('admin','supervisor','kurir')),
  courier_id text,
  rating numeric(2,1) default 4.8,
  daily_target int default 0,
  online boolean default false,
  avatar text,
  last_location jsonb,
  created_at timestamptz default now()
);

-- ===== 2. PACKAGES (master data paket) =====
create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  resi text unique not null,
  nama text,
  hp text,
  alamat text,
  catatan text,
  cod numeric(12,2) default 0,
  status text not null default 'todo'
    check (status in ('todo','in_progress','done','postponed','failed','return','pending')),
  prioritas boolean default false,
  jam text,
  tanggal date default current_date,
  kurir_id uuid references public.users(id),
  lat double precision,
  lng double precision,
  photos jsonb default '[]',
  signature text,
  receiver_name text,
  receiver_relation text,
  receiver_type text,
  fail_reason text,
  return_reason text,
  gps jsonb,
  history jsonb default '[]',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);
create index if not exists idx_packages_kurir on public.packages(kurir_id);
create index if not exists idx_packages_status on public.packages(status);
create index if not exists idx_packages_resi on public.packages(resi);

-- ===== 3. DELIVERIES (log penugasan pengiriman — histori assignment/transfer) =====
create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  package_id uuid references public.packages(id) on delete cascade,
  kurir_id uuid references public.users(id),
  assigned_at timestamptz default now(),
  status_at_assignment text,
  notes text
);
create index if not exists idx_deliveries_package on public.deliveries(package_id);

-- ===== 4. PICKUP =====
create table if not exists public.pickup (
  id uuid primary key default gen_random_uuid(),
  resi text not null,
  nama text,
  alamat text,
  status text default 'pending' check (status in ('pending','scanned','done')),
  kurir_id uuid references public.users(id),
  picked_at timestamptz,
  created_at timestamptz default now()
);

-- ===== 5. RETURNS =====
create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  resi text not null,
  reason text,
  photos jsonb default '[]',
  status text default 'return',
  kurir_id uuid references public.users(id),
  created_at timestamptz default now()
);

-- ===== 6. ATTENDANCE (absensi) =====
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  date date not null default current_date,
  check_in timestamptz,
  check_out timestamptz,
  photo_in text,
  photo_out text,
  gps_in jsonb,
  gps_out jsonb,
  unique (user_id, date)
);

-- ===== 7. WALLET (dompet kurir) =====
create table if not exists public.wallet (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.users(id) on delete cascade,
  saldo numeric(14,2) default 0,
  bonus numeric(14,2) default 0,
  insentif numeric(14,2) default 0,
  cod numeric(14,2) default 0,
  mutasi jsonb default '[]',
  updated_at timestamptz default now()
);

-- ===== 8. NOTIFICATIONS =====
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade, -- null = broadcast semua user
  title text not null,
  desc text,
  icon text default 'notifications',
  read boolean default false,
  created_at timestamptz default now()
);

-- ===== 9. HISTORY (log transfer paket antar kurir) =====
create table if not exists public.history (
  id uuid primary key default gen_random_uuid(),
  resi text not null,
  from_user uuid references public.users(id),
  to_user uuid references public.users(id),
  notes text,
  at timestamptz default now()
);

-- NB: 'settings' dan 'sync_queue' SENGAJA tidak dibuat di server —
-- keduanya device-local only (preferensi tampilan & antrian sinkron),
-- lihat db/schema.md bagian "Yang tidak disinkronkan".

-- =====================================================================
-- ROW LEVEL SECURITY
-- Aturan umum: admin & supervisor lihat semua; kurir hanya lihat/ubah
-- miliknya sendiri (kurir_id / user_id = auth.uid()).
-- =====================================================================
alter table public.users enable row level security;
alter table public.packages enable row level security;
alter table public.deliveries enable row level security;
alter table public.pickup enable row level security;
alter table public.returns enable row level security;
alter table public.attendance enable row level security;
alter table public.wallet enable row level security;
alter table public.notifications enable row level security;
alter table public.history enable row level security;

create or replace function public.is_staff() returns boolean as $$
  select exists (select 1 from public.users where id = auth.uid() and role in ('admin','supervisor'));
$$ language sql security definer stable;

-- USERS
create policy "users_select_self_or_staff" on public.users for select
  using (id = auth.uid() or public.is_staff());
create policy "users_update_self" on public.users for update
  using (id = auth.uid());

-- PACKAGES
create policy "packages_select" on public.packages for select
  using (kurir_id = auth.uid() or public.is_staff());
create policy "packages_insert_staff" on public.packages for insert
  with check (public.is_staff());
create policy "packages_update_own_or_staff" on public.packages for update
  using (kurir_id = auth.uid() or public.is_staff());

-- DELIVERIES
create policy "deliveries_select" on public.deliveries for select
  using (kurir_id = auth.uid() or public.is_staff());
create policy "deliveries_insert" on public.deliveries for insert
  with check (kurir_id = auth.uid() or public.is_staff());

-- PICKUP
create policy "pickup_select" on public.pickup for select
  using (kurir_id = auth.uid() or kurir_id is null or public.is_staff());
create policy "pickup_update" on public.pickup for update
  using (kurir_id = auth.uid() or public.is_staff());

-- RETURNS
create policy "returns_select" on public.returns for select
  using (kurir_id = auth.uid() or public.is_staff());
create policy "returns_insert" on public.returns for insert
  with check (kurir_id = auth.uid() or public.is_staff());

-- ATTENDANCE
create policy "attendance_select" on public.attendance for select
  using (user_id = auth.uid() or public.is_staff());
create policy "attendance_upsert" on public.attendance for insert
  with check (user_id = auth.uid());
create policy "attendance_update" on public.attendance for update
  using (user_id = auth.uid());

-- WALLET
create policy "wallet_select" on public.wallet for select
  using (user_id = auth.uid() or public.is_staff());

-- NOTIFICATIONS
create policy "notifications_select" on public.notifications for select
  using (user_id = auth.uid() or user_id is null or public.is_staff());
create policy "notifications_update_own" on public.notifications for update
  using (user_id = auth.uid());

-- HISTORY
create policy "history_select" on public.history for select
  using (from_user = auth.uid() or to_user = auth.uid() or public.is_staff());
