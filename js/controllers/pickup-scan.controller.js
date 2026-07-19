/* ===== Pickup Scan Controller ===== */
const PickupScanController = (() => {
  const scanned = [];
  async function init(container) {
    scanned.length = 0;
    const video = qs('#pickup-scanner-video', container);
    if (ScannerService.isSupported()) {
      try { await ScannerService.start(video, (code) => onScan(container, code), { continuous: true }); }
      catch (err) { Toast.show('Tidak bisa mengakses kamera', 'error'); }
    }
    on(qs('#btn-finish-pickup', container), 'click', async () => {
      ScannerService.stop();
      for (const item of scanned) {
        // Perbarui record pickup yang SUDAH ADA (jaga nama/alamat asli),
        // bukan bikin record baru terpisah — resi jadi kunci pencarian.
        const existing = (await DB.getAll(STORES.PICKUP)).find((p) => p.resi === item.resi);
        const updated = {
          ...(existing || { id: crypto.randomUUID(), resi: item.resi }),
          status: 'done', pickedAt: new Date().toISOString(), synced: false,
        };
        await DB.put(STORES.PICKUP, updated);
        await DB.queueSync({ store: 'pickup', type: existing ? 'update' : 'insert', payload: updated });
      }
      SyncEngine.pushQueue();
      Toast.show(`${scanned.length} paket selesai pickup`, 'success');
      Router.goTo('pickup');
    });
  }
  function onScan(container, resi) {
    if (scanned.find((s) => s.resi === resi)) return;
    const item = { id: crypto.randomUUID(), resi, status: 'scanned' };
    scanned.push(item);
    qs('#pickup-scan-count', container).textContent = scanned.length;
    qs('#pickup-scan-items', container).appendChild(createEl('li', '', resi));
  }
  return { init };
})();
Router.register('pickup-scan', PickupScanController);
