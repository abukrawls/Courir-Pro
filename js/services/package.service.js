/* =====================================================================
   Package Service — CRUD paket/pengiriman, Offline First + sync queue.
===================================================================== */
const PackageService = (() => {
  async function getAll() { return DB.getAll(STORES.PACKAGES); }

  async function getByStatus(status) {
    const all = await getAll();
    if (status === 'all') return all;
    return all.filter((p) => p.status === status);
  }

  async function getById(id) { return DB.get(STORES.PACKAGES, id); }

  async function search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return getAll();
    const all = await getAll();
    return all.filter((p) =>
      (p.resi || '').toLowerCase().includes(q) ||
      (p.nama || '').toLowerCase().includes(q) ||
      (p.hp || '').toLowerCase().includes(q) ||
      (p.alamat || '').toLowerCase().includes(q) ||
      (p.status || '').toLowerCase().includes(q) ||
      (p.tanggal || '').toLowerCase().includes(q)
    );
  }

  async function upsert(pkg) {
    const existing = pkg.id ? await getById(pkg.id) : null;
    const record = {
      ...pkg,
      createdAt: existing?.createdAt || pkg.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
    };
    await DB.put(STORES.PACKAGES, record);
    await DB.queueSync({ store: 'packages', type: pkg.id ? 'update' : 'insert', payload: record });
    SyncEngine.pushQueue();
    return record;
  }

  async function updateStatus(id, status, extra = {}) {
    const pkg = await getById(id);
    if (!pkg) throw new Error('Paket tidak ditemukan');
    const history = pkg.history || [];
    history.push({ status, at: new Date().toISOString(), ...extra });
    const updated = { ...pkg, status, history, ...extra };
    return upsert(updated);
  }

  async function findByResi(resi) {
    const all = await getAll();
    return all.find((p) => p.resi === resi.trim());
  }

  return { getAll, getByStatus, getById, search, upsert, updateStatus, findByResi };
})();
