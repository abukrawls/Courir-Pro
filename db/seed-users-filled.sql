-- Jalankan di SQL Editor Supabase — menghubungkan Auth user ke profil aplikasi

insert into public.users (id, username, name, role, courier_id, rating, daily_target, online)
values ('89241e7b-f217-489c-8e24-afbec9c37a7d', 'kurir1@couriertest.com', 'Budi Santoso', 'kurir', 'KR0001', 4.8, 12, true);

insert into public.users (id, username, name, role, courier_id)
values ('7d971a00-99cc-4c84-a022-af2cbd1bb75c', 'super1@couriertest.com', 'Sari Wulandari', 'supervisor', 'SP0001');

insert into public.users (id, username, name, role, courier_id)
values ('45d838d0-f1f3-4f6a-aa6b-12febcc287bd', 'admin1@couriertest.com', 'Rudi Hartono', 'admin', 'AD0001');

-- Dompet awal untuk akun kurir (opsional, biar dompet tidak kosong pas dicoba)
insert into public.wallet (user_id, saldo, bonus, insentif, cod, mutasi)
values ('89241e7b-f217-489c-8e24-afbec9c37a7d', 350000, 50000, 0, 0,
  '[{"type":"saldo","amount":350000,"note":"Pendapatan minggu ini","at":"2026-07-15T09:00:00Z"},
    {"type":"bonus","amount":50000,"note":"Bonus target tercapai","at":"2026-07-16T09:00:00Z"}]'::jsonb);
