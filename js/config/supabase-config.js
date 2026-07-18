/* =====================================================================
   Konfigurasi Supabase — Project: Courir-Pro
===================================================================== */
const SUPABASE_URL = 'https://vbnoighhkmtjwbvchzly.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wB_8YCMJlFgalWmvVtcF6w_QDBhfle-';

const SUPABASE_CONFIGURED = !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR-SUPABASE');

let supabaseClient = null;
if (SUPABASE_CONFIGURED && window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn('[Courier Pro] Supabase belum dikonfigurasi — berjalan mode offline-only.');
}
