/* =====================================================================
   Order Info Controller — dipakai untuk 2 jalur: klik kartu paket di
   Daftar Paket, dan hasil scan barcode/QR yang cocok. Semua data
   dibaca langsung dari IndexedDB (PackageService), tidak ada dummy data.
===================================================================== */
const PackageDetailController = (() => {
  let currentPkg = null;
  let mediaStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];

  async function init(container, params) {
    on(qs('#btn-order-back', container), 'click', () => Router.goTo('deliveries'));
    on(qs('#btn-order-refresh', container), 'click', () => loadAndRender(container, params.id));
    on(qs('#btn-order-copy-resi', container), 'click', () => copyText(currentPkg?.resi, 'Resi disalin'));
    on(qs('#btn-copy-resi-inline', container), 'click', () => copyText(currentPkg?.resi, 'Resi disalin'));
    on(qs('#btn-copy-alamat', container), 'click', () => copyText(currentPkg?.alamat, 'Alamat disalin'));
    on(qs('#btn-copy-hp', container), 'click', () => copyText(formatPhone(currentPkg?.hp), 'Nomor HP disalin'));
    on(qs('#btn-open-maps', container), 'click', () => openMaps());
    on(qs('#btn-action-navigate', container), 'click', () => openMaps());
    on(qs('#btn-action-contact', container), 'click', () => { if (currentPkg?.hp) location.href = 'tel:' + formatPhone(currentPkg.hp); });
    on(qs('#btn-action-complete', container), 'click', () => { if (currentPkg) Router.goTo('status-update', { id: currentPkg.id }); });
    on(qs('#btn-action-hold', container), 'click', () => setOnHold());
    on(qs('#btn-action-no-unboxing', container), 'click', () => waiveUnboxing());
    on(qs('#btn-share-order', container), 'click', () => shareOrder());

    on(qs('#btn-edit-alamat-rekomendasi', container), 'click', () => {
      qs('#input-alamat-rekomendasi', container).value = currentPkg?.alamatRekomendasi || currentPkg?.alamat || '';
      show(qs('#form-edit-alamat-rekomendasi', container));
    });
    on(qs('#btn-cancel-edit-alamat', container), 'click', () => hide(qs('#form-edit-alamat-rekomendasi', container)));
    on(qs('#form-edit-alamat-rekomendasi', container), 'submit', async (e) => {
      e.preventDefault();
      const val = qs('#input-alamat-rekomendasi', container).value.trim();
      currentPkg = await PackageService.upsert({ ...currentPkg, alamatRekomendasi: val });
      qs('#order-alamat-rekomendasi', container).textContent = val || '-';
      hide(qs('#form-edit-alamat-rekomendasi', container));
      Toast.show('Alamat rekomendasi disimpan', 'success');
    });

    on(qs('#btn-action-unboxing', container), 'click', () => openUnboxingModal(container));
    on(qs('#btn-cancel-unboxing', container), 'click', () => closeUnboxingModal(container));
    on(qs('#unboxing-modal-scrim', container), 'click', () => closeUnboxingModal(container));
    on(qs('#btn-start-record', container), 'click', () => startRecording(container));
    on(qs('#btn-stop-record', container), 'click', () => stopRecording(container));

    await loadAndRender(container, params.id);
  }

  function copyText(text, successMsg) {
    if (!text) return;
    navigator.clipboard.writeText(text)
      .then(() => Toast.show(successMsg, 'success'))
      .catch(() => Toast.show('Gagal menyalin', 'error'));
  }

  function openMaps() {
    if (!currentPkg) return;
    if (currentPkg.lat && currentPkg.lng) {
      GpsService.openNavigation(currentPkg.lat, currentPkg.lng);
    } else if (currentPkg.alamat) {
      window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(currentPkg.alamat), '_blank');
    }
  }

  async function setOnHold() {
    if (!currentPkg) return;
    currentPkg = await PackageService.updateStatus(currentPkg.id, 'postponed');
    Toast.show('Paket ditandai On-Hold (Ditunda)', 'success');
    renderStatusFields();
  }

  async function waiveUnboxing() {
    if (!currentPkg) return;
    currentPkg = await PackageService.upsert({ ...currentPkg, unboxingWaived: true });
    Toast.show('Ditandai: penerima tidak perlu unboxing', 'success');
  }

  async function shareOrder() {
    if (!currentPkg) return;
    const text = `Resi: ${currentPkg.resi}\nAlamat: ${currentPkg.alamat}\nPenerima: ${currentPkg.nama || '-'}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Order Info - ' + currentPkg.resi, text }); }
      catch (e) { /* dibatalkan user, abaikan */ }
    } else {
      copyText(text, 'Info order disalin (share tidak didukung perangkat ini)');
    }
  }

  async function loadAndRender(container, id) {
    show(qs('#order-info-loading', container));
    hide(qs('#order-info-content', container));
    hide(qs('#order-not-found', container));

    const pkg = await PackageService.getById(id);
    hide(qs('#order-info-loading', container));

    if (!pkg) {
      show(qs('#order-not-found', container));
      on(qs('#btn-back-not-found', container), 'click', () => Router.goTo('deliveries'));
      return;
    }
    currentPkg = pkg;
    show(qs('#order-info-content', container));
    renderAll(container);
  }

  function renderAll(container) {
    const pkg = currentPkg;
    qs('#order-resi', container).textContent = pkg.resi;
    renderStatusFields();

    qs('#order-alamat', container).textContent = pkg.alamat || '-';
    qs('#order-alamat-rekomendasi', container).textContent = pkg.alamatRekomendasi || pkg.alamat || '-';

    const codAmountEl = qs('#order-cod-amount', container);
    if (pkg.cod && pkg.cod > 0) {
      codAmountEl.textContent = formatCurrency(pkg.cod);
      codAmountEl.classList.remove('is-non-cod');
    } else {
      codAmountEl.textContent = 'Non COD';
      codAmountEl.classList.add('is-non-cod');
    }

    qs('#order-nama', container).textContent = pkg.nama || '-';
    qs('#order-hp', container).textContent = pkg.hp ? formatPhone(pkg.hp) : '-';
    qs('#order-call', container).href = 'tel:' + formatPhone(pkg.hp || '');
    qs('#order-whatsapp', container).href = 'https://wa.me/' + formatPhone(pkg.hp || '').replace('+', '');

    qs('#order-hub', container).textContent = pkg.hub || '-';
    qs('#order-tanggal-masuk', container).textContent = pkg.createdAt ? formatDateTime(pkg.createdAt) : '-';
    const lastHistory = (pkg.history || [])[pkg.history?.length - 1];
    qs('#order-tanggal-scan', container).textContent = lastHistory ? formatDateTime(lastHistory.at) : '-';
    qs('#order-status-terakhir', container).textContent = STATUS_LABELS[pkg.status] || pkg.status;

    resolveKurirName(container, pkg.kurirId);

    const photoGrid = qs('#order-photos', container);
    photoGrid.innerHTML = (pkg.photos || []).map((src) => `<img src="${src}" alt="Foto bukti paket">`).join('') || '<p class="empty-state">Belum ada foto</p>';

    const historyEl = qs('#order-history', container);
    historyEl.innerHTML = (pkg.history || []).slice().reverse().map((h) =>
      `<li><strong>${STATUS_LABELS[h.status] || h.status}</strong><br>${formatDateTime(h.at)}</li>`
    ).join('') || '<li>Belum ada riwayat</li>';
  }

  function renderStatusFields() {
    if (!currentPkg) return;
    const statusEl = qs('#order-status');
    statusEl.textContent = STATUS_LABELS[currentPkg.status] || currentPkg.status;
    statusEl.dataset.status = currentPkg.status;
    const codBadge = qs('#order-cod-check-badge');
    if (currentPkg.cod && currentPkg.cod > 0) show(codBadge); else hide(codBadge);
  }

  async function resolveKurirName(container, kurirId) {
    const el = qs('#order-kurir', container);
    if (!kurirId) { el.textContent = '-'; return; }
    const user = await DB.get(STORES.USERS, kurirId);
    el.textContent = user ? (user.name || user.username) : '-';
  }

  /* ===== Rekam Video Unboxing ===== */
  function openUnboxingModal(container) {
    show(qs('#unboxing-modal-scrim', container));
    show(qs('#unboxing-modal', container));
  }

  async function closeUnboxingModal(container) {
    hide(qs('#unboxing-modal-scrim', container));
    hide(qs('#unboxing-modal', container));
    if (mediaStream) { mediaStream.getTracks().forEach((t) => t.stop()); mediaStream = null; }
    show(qs('#btn-start-record', container)); hide(qs('#btn-stop-record', container));
  }

  async function startRecording(container) {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
      const video = qs('#unboxing-video-preview', container);
      video.srcObject = mediaStream;
      recordedChunks = [];
      mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
      mediaRecorder.start();
      hide(qs('#btn-start-record', container)); show(qs('#btn-stop-record', container));
      Toast.show('Merekam...', 'default');
    } catch (err) {
      Toast.show('Tidak bisa mengakses kamera: ' + err.message, 'error');
    }
  }

  async function stopRecording(container) {
    if (!mediaRecorder) return;
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      // Video disimpan lokal saja (IndexedDB) — tidak diikutkan sinkronisasi ke Supabase (ukurannya besar).
      currentPkg = await PackageService.upsert({ ...currentPkg, unboxingVideo: blob, unboxingVideoAt: new Date().toISOString() });
      Toast.show('Video unboxing tersimpan', 'success');
      closeUnboxingModal(container);
    };
    mediaRecorder.stop();
  }

  return { init };
})();
Router.register('package-detail', PackageDetailController);
