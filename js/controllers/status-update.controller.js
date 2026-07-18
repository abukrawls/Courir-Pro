/* ===== Status Update / Bukti Pengiriman Controller ===== */
const StatusUpdateController = (() => {
  let currentPkg = null;
  let selectedOutcome = null;
  const photos = [];
  let signaturePad = null;

  async function init(container, params) {
    currentPkg = await PackageService.getById(params.id);
    if (!currentPkg) { Router.goTo('deliveries'); return; }
    qs('#su-resi').textContent = currentPkg.resi;
    photos.length = 0;
    qs('#proof-photo-preview').innerHTML = '';
    selectedOutcome = null;

    setupSignaturePad();
    updateTimestamp();
    GpsService.getCurrentPosition()
      .then((pos) => { qs('#su-gps-coord').textContent = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`; qs('#su-gps-coord').dataset.lat = pos.lat; qs('#su-gps-coord').dataset.lng = pos.lng; })
      .catch(() => { qs('#su-gps-coord').textContent = 'GPS tidak tersedia'; });

    qsa('.outcome-btn', container).forEach((btn) => on(btn, 'click', () => selectOutcome(container, btn)));

    on(qs('#btn-camera-capture', container), 'click', () => qs('#input-photo-upload', container).setAttribute('capture', 'environment') || qs('#input-photo-upload', container).click());
    on(qs('#btn-upload-photo', container), 'click', () => { qs('#input-photo-upload', container).removeAttribute('capture'); qs('#input-photo-upload', container).click(); });
    on(qs('#input-photo-upload', container), 'change', async (e) => {
      for (const file of e.target.files) {
        const dataUrl = await compressImage(file);
        photos.push(dataUrl);
        const img = createEl('img'); img.src = dataUrl; img.alt = 'Bukti foto paket';
        qs('#proof-photo-preview', container).appendChild(img);
      }
    });

    on(qs('#btn-clear-signature', container), 'click', () => signaturePad.clear());

    on(qs('#form-proof', container), 'submit', onSubmit);
  }

  function updateTimestamp() { qs('#su-timestamp').textContent = formatDateTime(new Date().toISOString()); }

  function selectOutcome(container, btn) {
    qsa('.outcome-btn', container).forEach((b) => b.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    selectedOutcome = btn.dataset.outcome;
    hide(qs('#su-reason-success', container)); hide(qs('#su-reason-failed', container));
    if (selectedOutcome === 'success') show(qs('#su-reason-success', container));
    if (selectedOutcome === 'failed') show(qs('#su-reason-failed', container));
  }

  function setupSignaturePad() {
    const canvas = qs('#signature-pad');
    canvas.width = canvas.offsetWidth; canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2; ctx.strokeStyle = '#1A1C1E';
    let drawing = false;
    const pos = (e) => { const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; };
    const start = (e) => { drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e) => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); };
    const end = () => { drawing = false; };
    ['mousedown', 'touchstart'].forEach((ev) => canvas.addEventListener(ev, start));
    ['mousemove', 'touchmove'].forEach((ev) => canvas.addEventListener(ev, move));
    ['mouseup', 'touchend', 'mouseleave'].forEach((ev) => canvas.addEventListener(ev, end));
    signaturePad = { clear: () => ctx.clearRect(0, 0, canvas.width, canvas.height), toDataUrl: () => canvas.toDataURL('image/png') };
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!selectedOutcome) { Toast.show('Pilih hasil pengiriman terlebih dahulu', 'error'); return; }
    const statusMap = { success: 'done', failed: 'failed', return: 'return', pending: 'pending' };
    const extra = {
      photos: photos.length ? photos : currentPkg.photos,
      signature: signaturePad.toDataUrl(),
      receiverName: qs('#su-receiver-name').value,
      receiverRelation: qs('#su-receiver-relation').value,
      notes: qs('#su-notes').value,
      gps: { lat: Number(qs('#su-gps-coord').dataset.lat), lng: Number(qs('#su-gps-coord').dataset.lng) },
      receiverType: qs('#su-receiver-type')?.value,
      failReason: qs('#su-fail-reason')?.value,
    };
    await PackageService.updateStatus(currentPkg.id, statusMap[selectedOutcome], extra);
    Toast.show('Status paket berhasil diperbarui', 'success');
    Router.goTo('package-detail', { id: currentPkg.id });
  }

  return { init };
})();
Router.register('status-update', StatusUpdateController);
