# Courier Pro — Dokumentasi Database

Dua lapis penyimpanan (Offline First):

1. **IndexedDB** (`js/core/db.js`) — sumber data utama di perangkat, semua fitur baca/tulis ke sini dulu.
2. **Supabase Postgres** (`db/schema.sql`) — cloud, disinkronkan oleh `js/core/sync-engine.js` saat online.

## Pemetaan Store IndexedDB ↔ Tabel Supabase

| Store IndexedDB | Tabel Supabase | Keterangan |
|---|---|---|
| `users` | `public.users` | Profil pelengkap `auth.users` Supabase Auth |
| `packages` | `public.packages` | Master data paket — dipakai semua fitur (dashboard, daftar paket, scanner, laporan, kinerja) |
| `deliveries` | `public.deliveries` | Log penugasan/assignment paket ke kurir (riwayat, bukan status real-time — status real-time ada di `packages.status`) |
| `pickup` | `public.pickup` | Daftar & riwayat pickup |
| `returns` | `public.returns` | Data return beserta alasan & foto |
| `attendance` | `public.attendance` | Absensi check-in/out harian |
| `wallet` | `public.wallet` | Saldo, bonus, insentif, COD, mutasi (mutasi disimpan sebagai JSON array di kolom `mutasi`) |
| `notifications` | `public.notifications` | Notifikasi personal (`user_id` terisi) atau broadcast (`user_id` null) |
| `history` | `public.history` | Log transfer paket antar kurir |
| `settings` | *(tidak ada)* | **Device-local only** — lihat di bawah |
| `sync_queue` | *(tidak ada)* | **Device-local only** — lihat di bawah |

## Yang tidak disinkronkan ke server

- **`settings`**: preferensi tampilan (dark mode, ukuran font, bahasa, pengaturan scanner) memang spesifik per-perangkat, bukan data bisnis — sengaja disimpan lokal saja.
- **`sync_queue`**: antrian internal sinkronisasi (daftar perubahan yang belum terkirim ke server). Ini mekanisme teknis, bukan data — dikosongkan otomatis setelah berhasil dikirim (lihat `SyncEngine.pushQueue()`).

## Alur Sinkronisasi

1. Setiap perubahan data (`PackageService.upsert`, dll.) langsung ditulis ke IndexedDB **dan** dicatat ke `sync_queue`.
2. `SyncEngine.pushQueue()` berjalan otomatis saat: aplikasi start, koneksi kembali online, dan setiap 60 detik — mengirim isi antrian ke Supabase via `upsert`.
3. `SyncEngine.fullSync()` juga menarik (pull) data terbaru dari tabel `packages`, `deliveries`, `pickup`, `returns`, `notifications` agar antar-kurir/admin selalu sinkron.
4. Jika Supabase belum dikonfigurasi (`SUPABASE_CONFIGURED = false` di `js/config/supabase-config.js`), aplikasi tetap berjalan penuh secara offline — sinkron otomatis aktif begitu kredensial diisi (Tahap 8).

## Keamanan (Row Level Security)

Semua tabel Supabase mengaktifkan RLS:
- **Kurir** hanya bisa membaca/mengubah baris miliknya sendiri (`kurir_id` / `user_id` = akun yang login).
- **Admin & Supervisor** (fungsi `is_staff()`) bisa membaca semua baris, dan yang berhak membuat/menugaskan paket baru.

## Cara Menjalankan

1. Buka project Supabase kamu → **SQL Editor**.
2. Jalankan seluruh isi `db/schema.sql`.
3. Isi `SUPABASE_URL` & `SUPABASE_ANON_KEY` di `js/config/supabase-config.js` (dilakukan di Tahap 8).
