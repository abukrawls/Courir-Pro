/* =====================================================================
   Konfigurasi Supabase
   GANTI dua nilai di bawah dengan kredensial proyek Supabase kamu:
   Project Settings -> API -> Project URL & anon public key.
   Selama masih placeholder, aplikasi otomatis berjalan mode offline-only
   (semua data tersimpan di IndexedDB, sinkron akan gagal senyap).
===================================================================== */
const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR-SUPABASE-ANON-KEY';

const SUPABASE_CONFIGURED = !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR-SUPABASE');

let supabaseClient = null;
if (SUPABASE_CONFIGURED && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn('[Courier Pro] Supabase belum dikonfigurasi — berjalan mode offline-only.');
}
