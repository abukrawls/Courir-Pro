/* =====================================================================
   IndexedDB Wrapper — Offline First storage
   Semua store punya keyPath 'id' + index 'synced' untuk antrian sync,
   kecuali sync_queue (autoIncrement) dan settings (key-value).
===================================================================== */
const DB = (() => {
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(APP.DB_NAME, APP.DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        const mkStore = (name, keyPath = 'id') => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath });
            if (name !== STORES.SETTINGS && name !== STORES.SYNC_QUEUE) {
              store.createIndex('synced', 'synced', { unique: false });
              store.createIndex('status', 'status', { unique: false });
            }
          }
        };
        mkStore(STORES.USERS);
        mkStore(STORES.PACKAGES);
        mkStore(STORES.DELIVERIES);
        mkStore(STORES.PICKUP);
        mkStore(STORES.RETURNS);
        mkStore(STORES.ATTENDANCE);
        mkStore(STORES.WALLET);
        mkStore(STORES.NOTIFICATIONS);
        mkStore(STORES.HISTORY);
        mkStore(STORES.SETTINGS, 'key');
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'queueId', autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function tx(storeName, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(storeName, mode);
      const store = t.objectStore(storeName);
      const result = fn(store);
      t.oncomplete = () => resolve(result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  }

  function reqToPromise(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function put(storeName, record) {
    const db = await open();
    const t = db.transaction(storeName, 'readwrite');
    t.objectStore(storeName).put(record);
    return new Promise((res, rej) => { t.oncomplete = () => res(record); t.onerror = () => rej(t.error); });
  }

  async function bulkPut(storeName, records) {
    const db = await open();
    const t = db.transaction(storeName, 'readwrite');
    const store = t.objectStore(storeName);
    records.forEach((r) => store.put(r));
    return new Promise((res, rej) => { t.oncomplete = () => res(records); t.onerror = () => rej(t.error); });
  }

  async function get(storeName, key) {
    const db = await open();
    const t = db.transaction(storeName, 'readonly');
    return reqToPromise(t.objectStore(storeName).get(key));
  }

  async function getAll(storeName) {
    const db = await open();
    const t = db.transaction(storeName, 'readonly');
    return reqToPromise(t.objectStore(storeName).getAll());
  }

  async function remove(storeName, key) {
    const db = await open();
    const t = db.transaction(storeName, 'readwrite');
    t.objectStore(storeName).delete(key);
    return new Promise((res, rej) => { t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
  }

  async function queueSync(action) {
    // action: { store, type: 'insert'|'update', payload }
    const result = await put(STORES.SYNC_QUEUE, { ...action, queuedAt: new Date().toISOString() });
    requestBackgroundSync();
    return result;
  }

  function requestBackgroundSync() {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return; // Background Sync tidak didukung semua browser (mis. Safari) — SyncEngine tetap jalan via interval/online listener
    navigator.serviceWorker.ready
      .then((reg) => reg.sync.register('courier-pro-sync'))
      .catch((err) => console.warn('[DB] Background sync tidak tersedia:', err.message));
  }

  async function getSetting(key, fallback = null) {
    const rec = await get(STORES.SETTINGS, key);
    return rec ? rec.value : fallback;
  }
  async function setSetting(key, value) {
    return put(STORES.SETTINGS, { key, value });
  }

  return { open, put, bulkPut, get, getAll, remove, queueSync, getSetting, setSetting };
})();
