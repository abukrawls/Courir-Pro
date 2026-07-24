/* ===== Konstanta Aplikasi ===== */
const APP = {
  NAME: 'Courier Pro',
  VERSION: '1.0.0',
  DB_NAME: 'courier_pro_db',
  DB_VERSION: 1,
};

const STORES = {
  USERS: 'users',
  PACKAGES: 'packages',
  DELIVERIES: 'deliveries',
  PICKUP: 'pickup',
  RETURNS: 'returns',
  ATTENDANCE: 'attendance',
  WALLET: 'wallet',
  NOTIFICATIONS: 'notifications',
  HISTORY: 'history',
  SETTINGS: 'settings',
  SYNC_QUEUE: 'sync_queue',
};

const STORAGE_KEYS = {
  SESSION: 'cp_session',
  THEME: 'cp_theme',
  SETTINGS: 'cp_settings',
  PIN: 'cp_pin_hash',
};

/* route: { page: file HTML di /pages, title, header: boolean, bottomNav: boolean, auth: boolean, roles: [] } */
const ROUTES = {
  'login':            { page: 'login.html',            title: 'Masuk',            header:false, bottomNav:false, auth:false },
  'dashboard':        { page: 'dashboard.html',         title: 'Beranda',          header:true,  bottomNav:true,  auth:true,  roles:['admin','supervisor','kurir'] },
  'deliveries':       { page: 'deliveries.html',        title: 'Daftar Paket',     header:true,  bottomNav:true,  auth:true,  roles:['admin','supervisor','kurir'] },
  'package-detail':   { page: 'package-detail.html',    title: 'Detail Paket',     header:false, bottomNav:false, auth:true,  roles:['admin','supervisor','kurir'] },
  'scanner':          { page: 'scanner.html',           title: 'Pindai',           header:false, bottomNav:false, auth:true,  roles:['admin','supervisor','kurir'] },
  'status-update':    { page: 'status-update.html',     title: 'Update Status',    header:true,  bottomNav:false, auth:true,  roles:['kurir'] },
  'pickup':           { page: 'pickup.html',             title: 'Pickup',           header:true,  bottomNav:true,  auth:true,  roles:['admin','supervisor','kurir'] },
  'pickup-scan':      { page: 'pickup-scan.html',        title: 'Scan Pickup',      header:true,  bottomNav:false, auth:true,  roles:['kurir'] },
  'return':           { page: 'return.html',             title: 'Return',           header:true,  bottomNav:true,  auth:true,  roles:['admin','supervisor','kurir'] },
  'queue':            { page: 'queue.html',              title: 'Antrian',          header:true,  bottomNav:false, auth:true,  roles:['admin','supervisor','kurir'] },
  'absensi':          { page: 'absensi.html',            title: 'Absensi',          header:true,  bottomNav:true,  auth:true,  roles:['admin','supervisor','kurir'] },
  'laporan':          { page: 'laporan.html',            title: 'Laporan',          header:true,  bottomNav:true,  auth:true,  roles:['admin','supervisor','kurir'] },
  'kinerja':          { page: 'kinerja.html',            title: 'Kinerja',          header:true,  bottomNav:true,  auth:true,  roles:['admin','supervisor','kurir'] },
  'dompet':           { page: 'dompet.html',             title: 'Dompet',           header:true,  bottomNav:true,  auth:true,  roles:['kurir'] },
  'transfer':         { page: 'transfer.html',           title: 'Transfer Paket',   header:true,  bottomNav:false, auth:true,  roles:['kurir'] },
  'share-package':    { page: 'share-package.html',       title: 'Paket Titipan',    header:true,  bottomNav:false, auth:true,  roles:['admin','supervisor','kurir'] },
  'notifikasi':       { page: 'notifikasi.html',         title: 'Notifikasi',       header:true,  bottomNav:false, auth:true,  roles:['admin','supervisor','kurir'] },
  'setting':          { page: 'setting.html',            title: 'Pengaturan',       header:true,  bottomNav:true,  auth:true,  roles:['admin','supervisor','kurir'] },
  'admin-dashboard':  { page: 'admin-dashboard.html',    title: 'Admin Dashboard',  header:true,  bottomNav:false, auth:true,  roles:['admin'] },
  'admin-kurir':      { page: 'admin-kurir.html',        title: 'Data Kurir',       header:true,  bottomNav:false, auth:true,  roles:['admin','supervisor'] },
  'admin-paket':      { page: 'admin-paket.html',        title: 'Data Paket',       header:true,  bottomNav:false, auth:true,  roles:['admin','supervisor'] },
  'admin-monitoring': { page: 'admin-monitoring.html',   title: 'Monitoring',       header:true,  bottomNav:false, auth:true,  roles:['admin','supervisor'] },
};

const DEFAULT_ROUTE = 'dashboard';

const PACKAGE_STATUS = {
  TODO: 'todo', IN_PROGRESS: 'in_progress', DONE: 'done',
  POSTPONED: 'postponed', FAILED: 'failed', RETURN: 'return', TITIPAN: 'titipan',
};

const STATUS_LABELS = {
  todo: 'To Do', in_progress: 'Dalam Perjalanan', done: 'Selesai',
  postponed: 'Ditunda', failed: 'Gagal', return: 'Return', pending: 'Pending', titipan: 'Titipan',
};

const DRAWER_MENU_BY_ROLE = {
  kurir: [
    { route:'dashboard', icon:'home', label:'Beranda' },
    { route:'deliveries', icon:'local_shipping', label:'Daftar Paket' },
    { route:'pickup', icon:'inbox', label:'Pickup' },
    { route:'return', icon:'assignment_return', label:'Return' },
    { route:'absensi', icon:'fingerprint', label:'Absensi' },
    { route:'dompet', icon:'account_balance_wallet', label:'Dompet' },
    { route:'share-package', icon:'document_scanner', label:'Paket Titipan' },
    { route:'laporan', icon:'summarize', label:'Laporan' },
    { route:'kinerja', icon:'insights', label:'Kinerja' },
    { route:'notifikasi', icon:'notifications', label:'Notifikasi' },
    { route:'setting', icon:'settings', label:'Pengaturan' },
  ],
  supervisor: [
    { route:'admin-dashboard', icon:'dashboard', label:'Dashboard' },
    { route:'admin-kurir', icon:'groups', label:'Data Kurir' },
    { route:'admin-paket', icon:'inventory_2', label:'Data Paket' },
    { route:'admin-monitoring', icon:'monitor_heart', label:'Monitoring' },
    { route:'laporan', icon:'summarize', label:'Laporan' },
    { route:'setting', icon:'settings', label:'Pengaturan' },
  ],
  admin: [
    { route:'admin-dashboard', icon:'dashboard', label:'Dashboard' },
    { route:'admin-kurir', icon:'groups', label:'Data Kurir' },
    { route:'admin-paket', icon:'inventory_2', label:'Data Paket' },
    { route:'admin-monitoring', icon:'monitor_heart', label:'Monitoring' },
    { route:'laporan', icon:'summarize', label:'Laporan' },
    { route:'setting', icon:'settings', label:'Pengaturan' },
  ],
};
