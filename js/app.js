/* =====================================================================
   App Entry Point
===================================================================== */
window.addEventListener('error', (e) => {
  console.error('[Courier Pro] Uncaught error:', e.message, e.filename, e.lineno);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Courier Pro] Unhandled promise rejection:', e.reason);
});

(async function bootstrap() {
  // Prioritas #1: tampilkan UI SEGERA — tidak menunggu database/data demo/Supabase.
  // LoginController tidak butuh IndexedDB sama sekali, jadi halaman login pasti bisa muncul
  // walau ada masalah di lapisan data.
  AuthService.tryAutoLogin();
  setupShellChrome();
  registerServiceWorker();
  Router.start();

  // Semua proses data berjalan paralel di belakang layar. Setiap langkah dibungkus
  // try/catch sendiri-sendiri supaya satu proses gagal TIDAK menghentikan proses lain
  // ataupun membuat UI macet.
  seedDemoDataIfEmpty().catch((err) => console.error('[Courier Pro] Gagal membuat data demo:', err));
  applySavedPreferences().catch((err) => console.warn('[Courier Pro] Gagal memuat preferensi:', err));
  NotificationService.updateBadge().catch((err) => console.warn('[Courier Pro] Gagal memuat notifikasi:', err));
  initSupabaseClient()
    .then(() => { SyncEngine.start(); NotificationService.subscribeRealtime(); })
    .catch((err) => console.warn('[Courier Pro] Supabase init gagal:', err));
})();

/* ===== Service Worker: registrasi + jembatan pesan Background Sync ===== */
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then((reg) => console.info('[Courier Pro] Service worker aktif:', reg.scope))
      .catch((err) => console.warn('[Courier Pro] Gagal mendaftarkan service worker:', err.message));
  });
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'RUN_SYNC') SyncEngine.fullSync();
  });
}

/* ===== Shell: header, drawer, bottom-nav (elemen di luar #page-container) ===== */
function setupShellChrome() {
  const drawer = qs('#app-drawer');
  const scrim = qs('#drawer-scrim');

  function openDrawer() {
    const user = State.get('currentUser');
    if (!user) return;
    qs('#drawer-name').textContent = user.name || user.username;
    qs('#drawer-id').textContent = 'ID: ' + (user.courierId || (user.id || '').slice(0, 8));
    const menu = DRAWER_MENU_BY_ROLE[user.role] || [];
    qs('#drawer-menu').innerHTML = menu.map((m) =>
      `<li><button type="button" data-route="${m.route}"><span class="material-icon" aria-hidden="true">${m.icon}</span>${m.label}</button></li>`
    ).join('');
    show(drawer); show(scrim);
    drawer.setAttribute('aria-hidden', 'false');
  }
  function closeDrawer() { hide(drawer); hide(scrim); drawer.setAttribute('aria-hidden', 'true'); }

  on(qs('#btn-menu'), 'click', openDrawer);
  on(scrim, 'click', closeDrawer);
  on(qs('#btn-logout'), 'click', () => { closeDrawer(); AuthService.logout(); });
  delegate(qs('#drawer-menu'), 'click', '[data-route]', (e, el) => { closeDrawer(); Router.goTo(el.dataset.route); });

  on(qs('#btn-notification'), 'click', () => Router.goTo('notifikasi'));

  delegate(qs('#bottom-nav'), 'click', '.bottom-nav__item', (e, el) => Router.goTo(el.dataset.route));
  State.subscribe('currentRoute', () => {
    qsa('.bottom-nav__item').forEach((btn) => btn.classList.toggle('is-active', btn.dataset.route === State.get('currentRoute')));
  });
}

async function applySavedPreferences() {
  const settings = (await DB.getSetting('appSettings')) || {};
  document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');
  if (settings.fontSize) document.body.style.fontSize = { small: '13px', medium: '15px', large: '17px' }[settings.fontSize];
}

/* ===== Seed Data Demo (hanya berjalan sekali, saat store USERS kosong) =====
   Kredensial demo — silakan ganti/hapus saat produksi:
   - Kurir       : kurir1 / kurir123
   - Supervisor  : super1 / super123
   - Admin       : admin1 / admin123
*/
async function seedDemoDataIfEmpty() {
  const existingUsers = await DB.getAll(STORES.USERS);
  if (existingUsers.length > 0) return;

  const mkUser = async (u) => ({ ...u, id: crypto.randomUUID(), passwordHash: await AuthService.hashText(u.password), synced: false });
  const users = await Promise.all([
    mkUser({ username: 'kurir1', password: 'kurir123', role: 'kurir', name: 'Budi Santoso', courierId: 'KR0001', rating: 4.8, dailyTarget: 12, online: true }),
    mkUser({ username: 'super1', password: 'super123', role: 'supervisor', name: 'Sari Wulandari', courierId: 'SP0001' }),
    mkUser({ username: 'admin1', password: 'admin123', role: 'admin', name: 'Rudi Hartono', courierId: 'AD0001' }),
  ]);
  await DB.bulkPut(STORES.USERS, users);
  const kurir = users[0];

  const today = new Date().toISOString().slice(0, 10);
  const packages = [
    { id: crypto.randomUUID(), resi: 'CP2507170001', nama: 'Andi Wijaya', hp: '081234567890', alamat: 'Jl. Merdeka No. 12, Jakarta Pusat', status: 'todo', prioritas: true, cod: 150000, jam: '09:00', tanggal: today, kurirId: kurir.id, lat: -6.1751, lng: 106.8650, history: [{ status: 'todo', at: new Date().toISOString() }] },
    { id: crypto.randomUUID(), resi: 'CP2507170002', nama: 'Citra Lestari', hp: '081298765432', alamat: 'Jl. Sudirman No. 45, Jakarta Selatan', status: 'todo', prioritas: false, cod: 0, jam: '10:30', tanggal: today, kurirId: kurir.id, lat: -6.2088, lng: 106.8228, history: [{ status: 'todo', at: new Date().toISOString() }] },
    { id: crypto.randomUUID(), resi: 'CP2507170003', nama: 'Dedi Kurniawan', hp: '081311122233', alamat: 'Jl. Gatot Subroto No. 8, Jakarta Selatan', status: 'in_progress', prioritas: false, cod: 250000, jam: '11:15', tanggal: today, kurirId: kurir.id, lat: -6.2297, lng: 106.8253, history: [{ status: 'todo', at: new Date().toISOString() }, { status: 'in_progress', at: new Date().toISOString() }] },
    { id: crypto.randomUUID(), resi: 'CP2507160004', nama: 'Eka Putri', hp: '081344455566', alamat: 'Jl. Thamrin No. 1, Jakarta Pusat', status: 'done', prioritas: false, cod: 0, jam: '14:00', tanggal: today, kurirId: kurir.id, lat: -6.1944, lng: 106.8229, history: [{ status: 'todo', at: new Date().toISOString() }, { status: 'done', at: new Date().toISOString() }] },
    { id: crypto.randomUUID(), resi: 'CP2507160005', nama: 'Fajar Nugroho', hp: '081355566677', alamat: 'Jl. Kuningan No. 20, Jakarta Selatan', status: 'failed', prioritas: false, cod: 0, jam: '15:20', tanggal: today, kurirId: kurir.id, lat: -6.2333, lng: 106.8306, history: [{ status: 'todo', at: new Date().toISOString() }, { status: 'failed', at: new Date().toISOString(), failReason: 'tidak_bisa_dihubungi' }] },
  ];
  await DB.bulkPut(STORES.PACKAGES, packages);

  const pickup = [
    { id: crypto.randomUUID(), resi: 'CP2507170101', nama: 'Toko Jaya Abadi', alamat: 'Jl. Kebon Jeruk No. 5', status: 'pending', kurirId: kurir.id },
    { id: crypto.randomUUID(), resi: 'CP2507170102', nama: 'CV Makmur Sentosa', alamat: 'Jl. Pluit Raya No. 9', status: 'pending', kurirId: kurir.id },
  ];
  await DB.bulkPut(STORES.PICKUP, pickup);

  const notifications = [
    { id: crypto.randomUUID(), title: 'Paket baru ditugaskan', desc: 'Resi CP2507170001 menunggu diproses', icon: 'local_shipping', read: false, createdAt: new Date().toISOString() },
    { id: crypto.randomUUID(), title: 'Pengingat absensi', desc: 'Jangan lupa check-in hari ini', icon: 'fingerprint', read: false, createdAt: new Date().toISOString() },
  ];
  await DB.bulkPut(STORES.NOTIFICATIONS, notifications);

  await WalletService.addMutasi(kurir.id, { type: 'saldo', amount: 350000, note: 'Pendapatan minggu ini' }, false);
  await WalletService.addMutasi(kurir.id, { type: 'bonus', amount: 50000, note: 'Bonus target tercapai' }, false);

  console.info('[Courier Pro] Data demo berhasil dibuat. Login: kurir1/kurir123, super1/super123, admin1/admin123');
}
