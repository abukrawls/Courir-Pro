/* ===== Deliveries (Daftar Paket) Controller ===== */
const DeliveriesController = (() => {
  let activeStatus = 'todo';

  async function init(container) {
    activeStatus = 'todo';
    await render(container);

    delegate(container, 'click', '.tab', async (e, tab) => {
      qsa('.tab', container).forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active'); tab.setAttribute('aria-selected', 'true');
      activeStatus = tab.dataset.status;
      await render(container);
    });

    on(qs('#input-search-package', container), 'input', debounce(async (e) => {
      const results = await PackageService.search(e.target.value);
      renderList(container, e.target.value ? results : await PackageService.getByStatus(activeStatus));
    }, 250));

    delegate(container, 'click', '.package-card', (e, card) => Router.goTo('package-detail', { id: card.dataset.packageId }));
    on(qs('#fab-scan', container), 'click', () => Router.goTo('scanner'));
  }

  async function render(container) {
    const list = await PackageService.getByStatus(activeStatus);
    renderList(container, list);
  }

  function renderList(container, list) {
    const listEl = qs('#delivery-list', container);
    const emptyEl = qs('#delivery-empty', container);
    qs('#delivery-count-label', container).textContent = `${list.length} paket`;
    listEl.querySelectorAll('.package-card').forEach((el) => el.remove());
    if (!list.length) { show(emptyEl); return; }
    hide(emptyEl);
    list.forEach((p) => listEl.appendChild(DashboardController.renderPackageCard(p)));
  }

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  return { init };
})();
Router.register('deliveries', DeliveriesController);
