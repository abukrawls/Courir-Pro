/* ===== Deliveries (Daftar Paket) Controller ===== */
const DeliveriesController = (() => {
  let activeStatus = 'todo';
  let sortKey = null;   // null | 'time' | 'name'
  let sortDir = null;   // null | 'asc' | 'desc'

  async function init(container) {
    activeStatus = 'todo';
    sortKey = null; sortDir = null;
    updateSortChipsUI(container);
    await render(container);

    delegate(container, 'click', '.tab', async (e, tab) => {
      qsa('.tab', container).forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active'); tab.setAttribute('aria-selected', 'true');
      activeStatus = tab.dataset.status;
      await render(container);
    });

    on(qs('#input-search-package', container), 'input', debounce(async (e) => {
      const results = e.target.value ? await PackageService.search(e.target.value) : await getListForActiveTab();
      renderList(container, applySort(results));
    }, 250));

    on(qs('#btn-sort-time', container), 'click', () => handleSortClick(container, 'time'));
    on(qs('#btn-sort-name', container), 'click', () => handleSortClick(container, 'name'));

    delegate(container, 'click', '.package-card', (e, card) => Router.goTo('package-detail', { id: card.dataset.packageId }));
    on(qs('#fab-scan', container), 'click', () => Router.goTo('scanner'));
  }

  async function getListForActiveTab() {
    if (activeStatus === 'titipan') return PackageService.getTitipan();
    return PackageService.getByStatus(activeStatus);
  }

  async function render(container) {
    const list = await getListForActiveTab();
    renderList(container, applySort(list));
  }

  function handleSortClick(container, key) {
    if (sortKey !== key) {
      sortKey = key;
      sortDir = key === 'time' ? 'desc' : 'asc'; // default: Waktu -> terbaru dulu, Nama -> A-Z dulu
    } else {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc'; // klik lagi -> balik arah
    }
    updateSortChipsUI(container);
    render(container);
  }

  function updateSortChipsUI(container) {
    const timeBtn = qs('#btn-sort-time', container);
    const nameBtn = qs('#btn-sort-name', container);
    if (!timeBtn || !nameBtn) return;
    [timeBtn, nameBtn].forEach((btn) => btn.classList.remove('is-active'));
    const active = sortKey === 'time' ? timeBtn : sortKey === 'name' ? nameBtn : null;
    if (active) { active.classList.add('is-active'); active.dataset.dir = sortDir; }
  }

  function getSortTimestamp(p) {
    if (p.updatedAt) return new Date(p.updatedAt).getTime();
    if (p.tanggal) {
      const t = new Date(`${p.tanggal}T${(p.jam || '00:00').padStart(5, '0')}:00`);
      if (!isNaN(t)) return t.getTime();
    }
    return 0;
  }

  function applySort(list) {
    if (!sortKey) return list;
    const sorted = [...list];
    if (sortKey === 'time') {
      sorted.sort((a, b) => (getSortTimestamp(b) - getSortTimestamp(a)) * (sortDir === 'desc' ? 1 : -1));
    } else if (sortKey === 'name') {
      sorted.sort((a, b) => (a.nama || '').toLowerCase().localeCompare((b.nama || '').toLowerCase()) * (sortDir === 'asc' ? 1 : -1));
    }
    return sorted;
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
