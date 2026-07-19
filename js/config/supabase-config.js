/* =====================================================================
   Konfigurasi Supabase — Project: Courir-Pro
   Library supabase-js dimuat SECARA DINAMIS (bukan <script> statis di
   index.html) supaya kalau CDN lambat/tidak terjangkau, aplikasi TETAP
   bisa jalan offline — tidak ikut macet menunggu CDN.
===================================================================== */
const SUPABASE_URL = 'https://vbnoighhkmtjwbvchzly.supabase.co';
const SUPABASE_ANON_KEY = 'PASTE_JWT_ANON_KEY_DI_SINI';
const SUPABASE_CONFIGURED = !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR-SUPABASE');

let supabaseClient = null;

function loadScriptWithTimeout(src, timeoutMs) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timer = setTimeout(() => { script.remove(); reject(new Error('Timeout memuat ' + src)); }, timeoutMs);
    script.src = src;
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = () => { clearTimeout(timer); reject(new Error('Gagal memuat ' + src)); };
    document.head.appendChild(script);
  });
}

/* Dipanggil dari app.js (di-await sebelum fitur yang butuh Supabase dijalankan).
   Kalau gagal/timeout, aplikasi lanjut jalan sebagai offline-only — tidak melempar error ke atas. */
async function initSupabaseClient() {
  if (!SUPABASE_CONFIGURED) {
    console.warn('[Courier Pro] Supabase belum dikonfigurasi — berjalan mode offline-only.');
    return;
  }
  const CDN_SOURCES = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
    'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.js', // cadangan kalau jsdelivr diblokir/lambat
  ];
  for (const src of CDN_SOURCES) {
    try {
      await loadScriptWithTimeout(src, 6000);
      if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.info('[Courier Pro] Supabase terhubung.');
        return;
      }
    } catch (err) {
      console.warn('[Courier Pro] ' + err.message + ' — mencoba sumber lain / lanjut offline.');
    }
  }
  console.warn('[Courier Pro] Supabase tidak berhasil dimuat dari CDN manapun — berjalan mode offline-only.');
}
