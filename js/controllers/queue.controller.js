/* ===== Queue Controller ===== */
const QueueController = (() => {
  async function init(container, params) {
    const packages = await PackageService.getByStatus('todo');
    const idx = params.id ? packages.findIndex((p) => p.id === params.id) : 0;
    qs('#queue-number', container).textContent = String(Math.max(1, idx + 1)).padStart(3, '0');
    const pct = packages.length ? Math.round(((idx + 1) / packages.length) * 100) : 0;
    qs('#queue-progress-fill', container).style.width = pct + '%';
    qs('#queue-progress-bar', container).setAttribute('aria-valuenow', pct);
    qs('#queue-eta', container).textContent = GpsService.estimateEtaMinutes(packages.length * 1.2) + ' menit';
    const listEl = qs('#queue-list', container);
    listEl.innerHTML = '';
    packages.forEach((p) => listEl.appendChild(DashboardController.renderPackageCard(p)));
    delegate(listEl, 'click', '.package-card', (e, card) => Router.goTo('package-detail', { id: card.dataset.packageId }));
  }
  return { init };
})();
Router.register('queue', QueueController);
