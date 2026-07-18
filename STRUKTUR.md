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
8. **Firebase/Supabase** — integrasi backend nyata (butuh kredensial dari kamu)
9. **Testing** — checklist QA manual per fitur, validasi input, penanganan error
10. **Optimasi** — lazy load, image compression, caching, code cleanup

Setiap tahap menghasilkan kode lengkap tanpa menghapus/menyederhanakan tahap sebelumnya.
