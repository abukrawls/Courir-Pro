/* ===== Package Detail Controller ===== */
const PackageDetailController = (() => {
  async function init(container, params) {
    const pkg = await PackageService.getById(params.id);
    if (!pkg) { Toast.show('Paket tidak ditemukan', 'error'); Router.goTo('deliveries'); return; }

    // Kartu Ringkasan
    qs('#detail-resi').textContent = pkg.resi;
    qs('#detail-status').textContent = STATUS_LABELS[pkg.status] || pkg.status;
    qs('#detail-status').dataset.status = pkg.status;
    if (pkg.prioritas) show(qs('#detail-priority'));
    qs('#detail-alamat-top').textContent = pkg.alamat || '-';

    if (pkg.cod && pkg.cod > 0) show(qs('#detail-cod-check-badge'));
    else hide(qs('#detail-cod-check-badge'));

    on(qs('#btn-copy-resi'), 'click', async () => {
      try { await navigator.clipboard.writeText(pkg.resi); Toast.show('Resi disalin', 'success'); }
      catch (e) { Toast.show('Gagal menyalin resi', 'error'); }
    });

    // Kartu Jumlah COD
    const codAmountEl = qs('#detail-cod-amount');
    if (pkg.cod && pkg.cod > 0) {
      codAmountEl.textContent = formatCurrency(pkg.cod);
      codAmountEl.classList.remove('is-non-cod');
    } else {
      codAmountEl.textContent = 'Non COD';
      codAmountEl.classList.add('is-non-cod');
    }

    // Penerima
    qs('#detail-nama').textContent = pkg.nama || '-';
    qs('#detail-telepon').firstChild.textContent = formatPhone(pkg.hp) + ' ';
    qs('#detail-call').href = 'tel:' + formatPhone(pkg.hp);
    qs('#detail-whatsapp').href = 'https://wa.me/' + formatPhone(pkg.hp).replace('+', '');
    qs('#detail-catatan').textContent = pkg.catatan || '-';

    // Lokasi
    if (pkg.lat && pkg.lng) {
      qs('#detail-coords').textContent = `${pkg.lat.toFixed(5)}, ${pkg.lng.toFixed(5)}`;
      const pos = await GpsService.getCurrentPosition().catch(() => null);
      if (pos) {
        const dist = GpsService.haversineDistanceKm(pos, { lat: pkg.lat, lng: pkg.lng });
        qs('#detail-distance').textContent = dist.toFixed(1) + ' km';
        qs('#detail-eta').textContent = GpsService.estimateEtaMinutes(dist) + ' menit';
      }
    }
    on(qs('#btn-navigate'), 'click', () => { if (pkg.lat && pkg.lng) GpsService.openNavigation(pkg.lat, pkg.lng); });

    // Foto
    const photoGrid = qs('#detail-photos');
    photoGrid.innerHTML = (pkg.photos || []).map((src) => `<img src="${src}" alt="Foto bukti paket">`).join('') || '<p class="empty-state">Belum ada foto</p>';

    // Riwayat
    const historyEl = qs('#detail-history');
    historyEl.innerHTML = (pkg.history || []).slice().reverse().map((h) =>
      `<li><strong>${STATUS_LABELS[h.status] || h.status}</strong><br>${formatDateTime(h.at)}</li>`
    ).join('') || '<li>Belum ada riwayat</li>';

    on(qs('#btn-update-status'), 'click', () => Router.goTo('status-update', { id: pkg.id }));
  }
  return { init };
})();
Router.register('package-detail', PackageDetailController);
