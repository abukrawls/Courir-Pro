/* =====================================================================
   Sync Engine — Offline First
   - Semua perubahan data ditulis dulu ke IndexedDB + dimasukkan sync_queue.
   - Saat online & Supabase terkonfigurasi, antrian diproses ke server.
   - Auto-run saat startup, saat event 'online', dan tiap 60 detik.
===================================================================== */
const SyncEngine = (() => {
  let running = false;
  let intervalId = null;

  /* Field lokal (IndexedDB, gaya camelCase + penanda internal seperti
     'synced') TIDAK sama persis dengan kolom Supabase (snake_case, tanpa
     kolom 'synced'). Fungsi ini menerjemahkan payload sebelum dikirim,
     per tabel, supaya upsert tidak ditolak PostgREST. */
  const FIELD_MAP = {
    packages: {
      kurirId: 'kurir_id', receiverName: 'receiver_name', receiverRelation: 'receiver_relation',
      receiverType: 'receiver_type', failReason: 'fail_reason', returnReason: 'return_reason',
      updatedAt: 'updated_at', createdAt: 'created_at',
    },
    pickup: { kurirId: 'kurir_id', pickedAt: 'picked_at', createdAt: 'created_at' },
    returns: { kurirId: 'kurir_id', createdAt: 'created_at' },
    attendance: {
      userId: 'user_id', checkIn: 'check_in', checkOut: 'check_out',
      photoIn: 'photo_in', photoOut: 'photo_out', gpsIn: 'gps_in', gpsOut: 'gps_out',
    },
    wallet: { userId: 'user_id', updatedAt: 'updated_at' },
    notifications: { userId: 'user_id', createdAt: 'created_at' },
    history: { fromUser: 'from_user', toUser: 'to_user' },
  };
  // Field lokal-only yang TIDAK PERNAH ada di tabel Supabase manapun — selalu dibuang.
  const STRIP_ALWAYS = ['synced'];

  function normalizePayload(table, payload) {
    const clone = { ...payload };
    STRIP_ALWAYS.forEach((key) => delete clone[key]);
    const map = FIELD_MAP[table];
    if (map) {
      Object.entries(map).forEach(([camel, snake]) => {
        if (camel in clone) {
          clone[snake] = clone[camel];
          delete clone[camel];
        }
      });
    }
    return clone;
  }

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
            const payload = normalizePayload(table, item.payload);
            const { error } = await supabaseClient.from(table).upsert(payload);
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
