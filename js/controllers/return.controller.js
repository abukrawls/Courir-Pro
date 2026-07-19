/* ===== Return Controller ===== */
const ReturnController = (() => {
  let pendingResi = null;
  const photos = [];

  async function init(container) {
    await renderList(container);
    delegate(container, 'click', '.tab', (e, tab) => {
      qsa('.tab', container).forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active'); tab.setAttribute('aria-selected', 'true');
      const isScan = tab.dataset.returnTab === 'scan';
      qs('#return-list-panel', container).hidden = isScan;
      qs('#return-scan-panel', container).hidden = !isScan;
      if (isScan) startScanner(container);
    });

    on(qs('#btn-return-camera', container), 'click', async () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
      input.onchange = async () => {
        const dataUrl = await compressImage(input.files[0]);
        photos.push(dataUrl);
        const img = createEl('img'); img.src = dataUrl;
        qs('#return-photo-preview', container).appendChild(img);
      };
      input.click();
    });

    on(qs('#form-return-reason', container), 'submit', async (e) => {
      e.preventDefault();
      const record = {
        id: crypto.randomUUID(), resi: pendingResi, reason: qs('#return-reason').value,
        photos, status: 'return', kurirId: State.get('currentUser')?.id,
        createdAt: new Date().toISOString(), synced: false,
      };
      await DB.put(STORES.RETURNS, record);
      await DB.queueSync({ store: 'returns', type: 'insert', payload: record });
      const pkg = await PackageService.findByResi(pendingResi);
      if (pkg) await PackageService.updateStatus(pkg.id, 'return', { returnReason: record.reason });
      Toast.show('Return berhasil disimpan', 'success');
      photos.length = 0; qs('#form-return-reason', container).hidden = true;
      renderList(container);
    });
  }

  async function startScanner(container) {
    const video = qs('#return-scanner-video', container);
    if (!ScannerService.isSupported()) return;
    try {
      await ScannerService.start(video, (resi) => {
        pendingResi = resi;
        qs('#return-resi', container).textContent = resi;
        show(qs('#form-return-reason', container));
      });
    } catch (e) { Toast.show('Tidak bisa mengakses kamera', 'error'); }
  }

  async function renderList(container) {
    const all = await DB.getAll(STORES.RETURNS);
    const listEl = qs('#return-list', container);
    listEl.innerHTML = '';
    if (!all.length) { show(qs('#return-empty', container)); return; }
    hide(qs('#return-empty', container));
    all.forEach((r) => {
      const el = createEl('div', 'package-card');
      el.innerHTML = `<div class="package-card__content"><span class="mono">${escapeHtml(r.resi)}</span><p class="package-card__address">${escapeHtml(r.reason || '')}</p></div>`;
      listEl.appendChild(el);
    });
  }

  return { init };
})();
Router.register('return', ReturnController);
