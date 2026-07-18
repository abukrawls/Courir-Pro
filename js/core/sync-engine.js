/* =====================================================================
   Sync Engine — Offline First
   - Semua perubahan data ditulis dulu ke IndexedDB + dimasukkan sync_queue.
   - Saat online & Supabase terkonfigurasi, antrian diproses ke server.
   - Auto-run saat startup, saat event 'online', dan tiap 60 detik.
===================================================================== */
const SyncEngine = (() => {
  let running = false;
  let intervalId = null;

  async function pushQueue() {
    if (!SUPABASE_CONFIGURED || !supabaseClient || !navigator.onLine) return;
    if (running) return;
    running = true;
    try {
      const queue = await DB.getAll(STORES.SYNC_QUEUE);
      for (const item of queue) {
        try {
          const table = item.store;
          if (item.type === 'insert' || item.type === 'update') {
            const { error } = await supabaseClient.from(table).upsert(item.payload);
            if (error) throw error;
          } else if (item.type === 'delete') {
            const { error } = await supabaseClient.from(table).delete().eq('id', item.payload.id);
            if (error) throw error;
          }
          await DB.remove(STORES.SYNC_QUEUE, item.queueId);
        } catch (err) {
          console.warn('[Sync] gagal memproses item, dicoba lagi nanti:', err.message);
          break; // hentikan agar urutan tetap, coba lagi di siklus berikutnya
        }
      }
      await DB.setSetting('lastSyncAt', new Date().toISOString());
      State.set('lastSyncAt', new Date().toISOString());
    } finally {
      running = false;
    }
  }

  async function pullTable(table, store) {
    if (!SUPABASE_CONFIGURED || !supabaseClient) return;
    const { data, error } = await supabaseClient.from(table).select('*');
    if (!error && data) await DB.bulkPut(store, data.map((r) => ({ ...r, synced: true })));
  }

  async function fullSync() {
    if (!SUPABASE_CONFIGURED || !navigator.onLine) return;
    await pushQueue();
    await Promise.all([
      pullTable('packages', STORES.PACKAGES),
      pullTable('deliveries', STORES.DELIVERIES),
      pullTable('pickup', STORES.PICKUP),
      pullTable('returns', STORES.RETURNS),
      pullTable('notifications', STORES.NOTIFICATIONS),
    ]);
  }

  function updateConnectionStatus() {
    const online = navigator.onLine;
    State.set('online', online);
    const dot = qs('#status-dot') || qs('#status-connection');
    if (dot) dot.dataset.state = online ? 'online' : 'offline';
  }

  function start() {
    updateConnectionStatus();
    window.addEventListener('online', () => { updateConnectionStatus(); fullSync(); });
    window.addEventListener('offline', updateConnectionStatus);
    intervalId = setInterval(() => { if (navigator.onLine) fullSync(); }, 60000);
    if (navigator.onLine) fullSync();
  }

  return { start, fullSync, pushQueue };
})();
