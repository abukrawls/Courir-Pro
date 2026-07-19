-- =====================================================================
-- Template: hubungkan Supabase Auth user ke tabel public.users
-- CARA PAKAI:
-- 1. Buat user di Authentication > Users > Add user (isi email + password)
-- 2. Copy UID yang muncul di kolom "UID" pada daftar user
-- 3. Ganti 'PASTE-UID-DI-SINI' di bawah dengan UID tsb, sesuaikan data lain
-- 4. Jalankan query INSERT ini di SQL Editor
-- =====================================================================

insert into public.users (id, username, name, role, courier_id, rating, daily_target, online)
values
  ('PASTE-UID-KURIR-DI-SINI', 'kurir1@couriertest.com', 'Budi Santoso', 'kurir', 'KR0001', 4.8, 12, true);

-- Ulangi untuk supervisor & admin:
-- insert into public.users (id, username, name, role, courier_id)
-- values ('PASTE-UID-SUPERVISOR', 'super1@couriertest.com', 'Sari Wulandari', 'supervisor', 'SP0001');

-- insert into public.users (id, username, name, role, courier_id)
-- values ('PASTE-UID-ADMIN', 'admin1@couriertest.com', 'Rudi Hartono', 'admin', 'AD0001');
