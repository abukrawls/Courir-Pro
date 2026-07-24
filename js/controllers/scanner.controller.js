/* ===== Scanner Controller ===== */
const ScannerController = (() => {
  let mode = 'single';
  const multiResults = [];

  async function init(container) {
    mode = 'single';
    multiResults.length = 0;
    const video = qs('#scanner-video', container);
    const resultEl = qs('#scanner-result', container);

    if (!ScannerService.isSupported()) {
      resultEl.textContent = 'Browser tidak mendukung kamera pemindai — gunakan input manual di bawah.';
    } else {
      try {
        await ScannerService.start(video, (code) => onDetect(container, code));
      } catch (err) {
        resultEl.textContent = 'Tidak bisa mengakses kamera: ' + err.message;
      }
    }

    qsa('.chip[data-scan-mode]', container).forEach((chip) => on(chip, 'click', () => {
      qsa('.chip[data-scan-mode]', container).forEach((c) => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      mode = chip.dataset.scanMode;
      show(qs('#scanner-multi-list', container)); if (mode === 'single') hide(qs('#scanner-multi-list', container));
    }));

    on(qs('#btn-scanner-flash', container), 'click', (e) => {
      const pressed = e.currentTarget.getAttribute('aria-pressed') === 'true';
      ScannerService.toggleTorch(!pressed);
      e.currentTarget.setAttribute('aria-pressed', String(!pressed));
    });
    on(qs('#btn-scanner-close', container), 'click', () => { ScannerService.stop(); Router.goTo('deliveries'); });
    on(qs('#btn-scanner-multi-done', container), 'click', () => { ScannerService.stop(); Router.goTo('deliveries'); });

    on(qs('#form-manual-resi', container), 'submit', async (e) => {
      e.preventDefault();
      const resi = qs('#input-manual-resi', container).value.trim();
      if (resi) onDetect(container, resi);
    });

    on(qs('#btn-not-found-ok', container), 'click', () => {
      hide(qs('#not-found-scrim', container)); hide(qs('#not-found-modal', container));
      qs('#input-manual-resi', container).value = '';
      if (ScannerService.isSupported() && mode !== 'stopped') {
        ScannerService.start(video, (code) => onDetect(container, code)).catch(() => {});
      }
    });
  }

  function showNotFound(container, resi) {
    ScannerService.stop();
    qs('#scanner-result', container).textContent = '';
    show(qs('#not-found-scrim', container));
    show(qs('#not-found-modal', container));
  }

  async function onDetect(container, resi) {
    const pkg = await PackageService.findByResi(resi);
    if (!pkg) { showNotFound(container, resi); return; }

    if (mode === 'multi' || mode === 'continuous') {
      multiResults.push(pkg);
      qs('#scanner-multi-count', container).textContent = multiResults.length;
      const li = createEl('li', '', `${pkg.resi} — ${escapeHtml(pkg.nama)}`);
      qs('#scanner-multi-items', container).appendChild(li);
      qs('#scanner-result', container).textContent = `Ditambahkan: ${pkg.resi}`;
    } else {
      ScannerService.stop();
      Router.goTo('package-detail', { id: pkg.id });
    }
  }

  return { init };
})();
Router.register('scanner', ScannerController);
