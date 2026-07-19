# Courier Pro — Struktur Proyek & Roadmap

PWA kurir profesional, Offline First, Material Design 3, siap dibundel jadi APK via PWA Builder.

## Struktur Folder

```
courier-pro/
├── index.html                  # Shell aplikasi (satu halaman, SPA)
├── manifest.json                # Manifest PWA (Tahap 7)
├── service-worker.js            # Cache & background sync (Tahap 6)
│
├── css/
│   ├── base/                    # reset, variables (design tokens MD3), typography
│   ├── components/               # card, button, bottom-sheet, fab, skeleton, dll
│   ├── layouts/                  # header, bottom-nav, drawer, grid
│   └── pages/                    # style khusus per halaman (login, dashboard, dst)
│
├── js/
│   ├── config/                   # konfigurasi Firebase/Supabase, konstanta app
│   ├── core/                     # router, state management, IndexedDB wrapper, sync engine
│   ├── services/                 # auth, scanner, gps, notification, wallet, report
│   ├── models/                   # skema data: User, Package, Delivery, Pickup, Return, dll
│   ├── controllers/               # logika tiap halaman (dashboard, detail-paket, absensi, dst)
│   ├── utils/                     # helper: format tanggal, validasi, kompresi gambar
│   └── firebase/                  # inisialisasi & query Firebase/Supabase
│
├── pages/                        # partial HTML per fitur (dimuat SPA oleh router)
├── assets/{icons,images,fonts}   # ikon MD3, logo, font
├── db/                            # skema database (users, packages, deliveries, dst)
└── docs/                          # dokumentasi
```

## Status: Backend = Supabase

## Roadmap 10 Tahap (sesuai instruksi)

1. **Struktur folder** — ✅ selesai
2. **Semua file HTML** — ✅ selesai (index.html + 20 halaman: login, dashboard, deliveries, package-detail, scanner, status-update, pickup, pickup-scan, return, queue, absensi, laporan, kinerja, dompet, transfer, notifikasi, setting, admin-dashboard, admin-kurir, admin-paket, admin-monitoring)
3. **Semua CSS** — ✅ selesai (design tokens MD3 di variables.css — primary #2E5AAC, accent #FF6B35, status semantik, dark mode; reset; typografi Plus Jakarta Sans + Inter + JetBrains Mono; layout header/bottom-nav/drawer; komponen card/button/badge/tabs/fab/skeleton/toast/modal/form; style per 11 kelompok halaman)
4. **Semua JavaScript** — ✅ selesai (37 file: config 2, utils 4, core 4, services 7, controllers 18, app.js). Router hash-based, IndexedDB Offline First, sync queue ke Supabase, auth multi-metode (password/PIN/biometrik), scanner via BarcodeDetector API, GPS, absensi selfie+lokasi, dompet, laporan+export CSV/print, admin panel. Data demo otomatis ter-seed saat pertama kali dibuka — login: `kurir1/kurir123`, `super1/super123`, `admin1/admin123`.
5. **Database** — ✅ selesai (`db/schema.sql`: 9 tabel Supabase Postgres lengkap dengan index & Row Level Security per role; `db/schema.md`: pemetaan IndexedDB↔Supabase, alur sinkronisasi, cara menjalankan)
6. **Service Worker** — ✅ selesai (`service-worker.js`: precache app shell toleran-error, strategi Cache First untuk aset statis + Network First untuk halaman dengan fallback ke `index.html`, Background Sync `courier-pro-sync` yang membangunkan halaman aktif untuk `SyncEngine.fullSync()`, dukungan push notification; terdaftar & terhubung dari `app.js` dan `core/db.js`)
7. **Manifest** — ✅ selesai (`manifest.json` lengkap: 10 ikon PNG ter-generate — 8 ukuran standar + 2 maskable untuk adaptive icon Android, apple-touch-icon, favicon.ico, shortcuts ke Scanner/Daftar Paket/Absensi; logo.svg & avatar-placeholder.svg dibuat; **bonus perbaikan bug**: path `../assets/...` di 4 file diperbaiki jadi relatif-ke-root karena halaman dimuat via `fetch()` ke dalam `index.html`, bukan iframe)
8. **Firebase/Supabase** — ✅ selesai (project `Courir-Pro` tersambung, kredensial live di `js/config/supabase-config.js`, 3 akun nyata dibuat lewat Authentication + terhubung ke `public.users`, RLS diverifikasi lengkap dan diperbaiki langsung lewat MCP Supabase — lihat "Perbaikan Pasca-Deploy" di bawah)
9. **Testing** — ✅ diverifikasi manual end-to-end (login online/offline, sinkronisasi, console bersih dari error) — checklist QA formal per fitur belum dibuat, bisa ditambahkan kalau dibutuhkan
10. **Optimasi** — sebagian besar sudah diterapkan sejak awal (lazy page loading via router, image compression di `utils/image.js`, cache strategy di service worker); belum ada audit performa formal (Lighthouse dsb.)

Setiap tahap menghasilkan kode lengkap tanpa menghapus/menyederhanakan tahap sebelumnya.

## Perbaikan Pasca-Deploy (penting untuk konteks ke depan)

Setelah Tahap 8, ditemukan & diperbaiki serangkaian bug nyata saat testing di perangkat asli:

1. **Halaman macet loading permanen** — akar masalah: `<script>` CDN Supabase yang blocking di
   `index.html` + Service Worker yang tidak pernah re-install karena isinya sendiri tak berubah
   antar fix. Diperbaiki dengan: memuat Supabase secara dinamis+timeout (non-blocking), bootstrap
   `app.js` dirombak supaya `Router.start()` jalan paling awal tanpa menunggu DB/seed/Supabase,
   dan `CACHE_VERSION` di `service-worker.js` **wajib dinaikkan** setiap ada file ter-cache yang
   berubah (sekarang di v5).
2. **Sinkronisasi ke Supabase gagal diam-diam** — payload lokal (camelCase + field `synced`)
   dikirim apa adanya ke tabel Supabase (snake_case, tanpa kolom `synced`). Diperbaiki lewat
   `normalizePayload()` komprehensif di `core/sync-engine.js` untuk semua tabel.
3. **Fitur Pickup & Transfer belum benar-benar sinkron** — `pickup-scan.controller.js` dan
   `transfer.controller.js` sebelumnya cuma nulis ke IndexedDB tanpa `DB.queueSync()`. Sudah
   diperbaiki + transfer sekarang benar-benar memindahkan `kurir_id` paket, bukan cuma catat log.
4. **RLS wallet tidak lengkap & ada policy tidak aman** — `schema.sql` awal lupa menambahkan
   policy INSERT/UPDATE untuk `wallet` dan `pickup`, sempat "ditambal" manual dengan policy
   `anon` yang mengizinkan akses tanpa login. Sudah diperbaiki lewat MCP Supabase langsung:
   policy tidak aman dihapus, kolom `synced` yang nyasar di tabel `wallet` dihapus, policy resmi
   `wallet_insert`/`wallet_update`/`pickup_insert` ditambahkan — dan `db/schema.sql` disesuaikan.

Status saat ini: console bersih tanpa error, login online (Supabase) & offline (IndexedDB) sama-sama
berfungsi, sinkronisasi terverifikasi lewat pengecekan langsung ke database via MCP Supabase.
