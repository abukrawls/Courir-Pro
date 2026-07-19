# Courier Pro

Aplikasi kurir profesional — PWA (Progressive Web App), Offline First, Material Design 3.
Dibangun dengan HTML/CSS/JavaScript murni (tanpa framework), IndexedDB untuk penyimpanan
offline, dan Supabase sebagai backend cloud (auth, database, realtime, RLS).

🔗 **Live**: https://abukrawls.github.io/Courir-Pro/

## Fitur Utama

- Login multi-role (Admin, Supervisor, Kurir) — password, PIN, atau biometrik
- Dashboard real-time: target harian, status GPS/baterai/internet, statistik
- Manajemen paket lengkap: to-do, dalam perjalanan, selesai, gagal, return
- Scanner barcode/QR (native `BarcodeDetector` API, fallback input manual)
- Bukti pengiriman: foto, tanda tangan digital, GPS, timestamp
- Pickup & Return dengan scan resi
- Absensi (check-in/out) dengan selfie + GPS
- Laporan (harian/mingguan/bulanan/custom) + export CSV & print
- Dompet kurir: saldo, bonus, insentif, COD, riwayat mutasi
- Transfer paket antar kurir
- Panel admin: data kurir, data paket, monitoring
- **Offline First**: semua data tersimpan di IndexedDB, sinkron otomatis ke Supabase saat online
- Installable sebagai APK lewat [PWA Builder](https://www.pwabuilder.com)

## Struktur Proyek

Lihat [`docs/STRUKTUR.md`](docs/STRUKTUR.md) untuk peta lengkap folder dan riwayat pengembangan
per tahap.

## Setup Backend (Supabase)

1. Jalankan `db/schema.sql` di SQL Editor project Supabase kamu (lengkap dengan Row Level Security)
2. Isi kredensial di `js/config/supabase-config.js` (`SUPABASE_URL` & `SUPABASE_ANON_KEY`,
   dari Project Settings → API)
3. Buat user login lewat **Authentication → Users**, lalu hubungkan ke tabel `public.users`
   — lihat contoh di `db/seed-users-template.sql`

Lihat [`db/schema.md`](db/schema.md) untuk detail pemetaan IndexedDB ↔ Supabase dan alur sinkronisasi.

## Akun Demo (offline, tanpa Supabase)

| Role | Username | Password |
|---|---|---|
| Kurir | `kurir1` | `kurir123` |
| Supervisor | `super1` | `super123` |
| Admin | `admin1` | `admin123` |

Data demo ini otomatis dibuat di IndexedDB saat pertama kali aplikasi dibuka (lihat `js/app.js`).

## Deploy sebagai APK

1. Deploy folder ini ke hosting HTTPS (GitHub Pages sudah cocok)
2. Buka [pwabuilder.com](https://www.pwabuilder.com), masukkan URL situsnya
3. Download paket Android — siap di-install atau di-submit ke Play Store

## Development

Tidak ada build step — semua file HTML/CSS/JS bisa langsung diedit dan di-deploy.
Setiap kali mengubah file yang di-cache oleh Service Worker (css/js/html), **naikkan
`CACHE_VERSION`** di `service-worker.js` agar pengguna menerima update-nya.
