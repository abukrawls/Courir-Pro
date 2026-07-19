/* =====================================================================
   Courier Pro — Service Worker
   Strategi:
   - App shell (HTML/CSS/JS lokal): Cache First + update di background
   - Navigasi (index.html / halaman SPA): Network First, fallback ke cache,
     fallback akhir ke index.html (agar SPA tetap terbuka saat offline)
   - Request lintas origin (Supabase, Google Fonts, dsb): dibiarkan lewat
     langsung ke network, tidak di-cache (data dinamis / third-party)
   - Background Sync: memberi tahu halaman aktif untuk menjalankan
     SyncEngine.fullSync() begitu koneksi & registrasi sync tersedia
===================================================================== */

const CACHE_VERSION = 'courier-pro-v5'; // naikkan angka ini SETIAP KALI ada file yang di-cache (css/js/html) berubah
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './css/base/reset.css', './css/base/variables.css', './css/base/typography.css',
  './css/layouts/header.css', './css/layouts/bottom-nav.css', './css/layouts/drawer.css', './css/layouts/grid.css',
  './css/components/card.css', './css/components/button.css', './css/components/badge.css', './css/components/tabs.css',
  './css/components/bottom-sheet.css', './css/components/fab.css', './css/components/skeleton.css',
  './css/components/toast.css', './css/components/modal.css', './css/components/form.css',
  './css/pages/login.css', './css/pages/dashboard.css', './css/pages/deliveries.css', './css/pages/package-detail.css',
  './css/pages/scanner.css', './css/pages/pickup-return.css', './css/pages/absensi.css', './css/pages/laporan.css',
  './css/pages/dompet.css', './css/pages/setting.css', './css/pages/admin.css',
  './js/config/constants.js', './js/config/supabase-config.js',
  './js/utils/dom.js', './js/utils/format.js', './js/utils/validation.js', './js/utils/image.js',
  './js/core/db.js', './js/core/state.js', './js/core/router.js', './js/core/sync-engine.js',
  './js/services/auth.service.js', './js/services/package.service.js', './js/services/scanner.service.js',
  './js/services/gps.service.js', './js/services/notification.service.js', './js/services/wallet.service.js',
  './js/services/report.service.js', './js/services/attendance.service.js',
  './js/controllers/login.controller.js', './js/controllers/dashboard.controller.js',
  './js/controllers/deliveries.controller.js', './js/controllers/package-detail.controller.js',
  './js/controllers/scanner.controller.js', './js/controllers/status-update.controller.js',
  './js/controllers/pickup.controller.js', './js/controllers/pickup-scan.controller.js',
  './js/controllers/return.controller.js', './js/controllers/queue.controller.js',
  './js/controllers/absensi.controller.js', './js/controllers/laporan.controller.js',
  './js/controllers/kinerja.controller.js', './js/controllers/dompet.controller.js',
  './js/controllers/transfer.controller.js', './js/controllers/notifikasi.controller.js',
  './js/controllers/setting.controller.js', './js/controllers/admin.controller.js',
  './js/app.js',
  './manifest.json',
];

const PAGE_HTML_URLS = [
  'login.html','dashboard.html','deliveries.html','package-detail.html','scanner.html','status-update.html',
  'pickup.html','pickup-scan.html','return.html','queue.html','absensi.html','laporan.html','kinerja.html',
  'dompet.html','transfer.html','notifikasi.html','setting.html','admin-dashboard.html','admin-kurir.html',
  'admin-paket.html','admin-monitoring.html',
].map((f) => `./pages/${f}`);

/* ===== INSTALL: precache app shell (toleran — satu file gagal tidak membatalkan semua) ===== */
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url).catch((e) => console.warn('[SW] gagal precache', url, e.message))));
    const pageCache = await caches.open(PAGES_CACHE);
    await Promise.allSettled(PAGE_HTML_URLS.map((url) => pageCache.add(url).catch((e) => console.warn('[SW] gagal precache halaman', url, e.message))));
    self.skipWaiting();
  })());
});

/* ===== ACTIVATE: bersihkan cache versi lama ===== */
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('courier-pro-') && k !== STATIC_CACHE && k !== PAGES_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* ===== FETCH ===== */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return; // jangan intercept POST/PUT dsb (mis. Supabase mutation)
  if (url.origin !== self.location.origin) return; // biarkan request lintas origin (Supabase, font, dsb) apa adanya

  const isNavigation = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isNavigation) {
    event.respondWith(networkFirstThenCache(req, PAGES_CACHE, './index.html'));
    return;
  }
  event.respondWith(cacheFirstThenNetwork(req, STATIC_CACHE));
});

async function cacheFirstThenNetwork(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) {
    // update cache di background (stale-while-revalidate ringan)
    fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); }).catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return new Response('Offline dan file belum tersimpan di cache.', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirstThenCache(req, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;
    const shell = await caches.match(fallbackUrl);
    return shell || new Response('Offline — halaman belum pernah dibuka sebelumnya.', { status: 503 });
  }
}

/* ===== BACKGROUND SYNC =====
   Didaftarkan dari halaman (lihat js/core/db.js -> queueSync) dengan tag
   'courier-pro-sync'. Service worker sendiri tidak menyimpan logika sync
   (butuh IndexedDB + Supabase client milik halaman) — SW hanya membangunkan
   klien yang aktif untuk menjalankan SyncEngine.fullSync().
===================================================================== */
self.addEventListener('sync', (event) => {
  if (event.tag === 'courier-pro-sync') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const allClients = await self.clients.matchAll({ type: 'window' });
  allClients.forEach((client) => client.postMessage({ type: 'RUN_SYNC' }));
}

/* ===== PUSH NOTIFICATION (opsional, aktif jika server mengirim push) ===== */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(self.registration.showNotification(data.title || 'Courier Pro', {
    body: data.body || '', icon: './assets/icons/icon-192.png', badge: './assets/icons/icon-192.png',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
    if (clientsArr.length) return clientsArr[0].focus();
    return self.clients.openWindow('./');
  }));
});
