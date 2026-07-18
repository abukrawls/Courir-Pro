/* ===== Pickup Controller ===== */
const PickupController = (() => {
  async function init(container) {
    await renderList(container);
    delegate(container, 'click', '.tab', async (e, tab) => {
      qsa('.tab', container).forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active'); tab.setAttribute('aria-selected', 'true');
      const isHistory = tab.dataset.pickupTab === 'history';
      qs('#pickup-list-panel', container).hidden = isHistory;
      qs('#pickup-history-panel', container).hidden = !isHistory;
    });
    on(qs('#fab-scan-pickup', container), 'click', () => Router.goTo('pickup-scan'));
  }

  async function renderList(container) {
    const all = await DB.getAll(STORES.PICKUP);
    const pending = all.filter((p) => p.status !== 'done');
    const history = all.filter((p) => p.status === 'done');
    const listEl = qs('#pickup-list', container);
    listEl.innerHTML = '';
    if (!pending.length) show(qs('#pickup-empty', container));
    else pending.forEach((p) => listEl.appendChild(renderPickupCard(p)));
    qs('#pickup-history-list', container).innerHTML = history.map((p) => `<div class="package-card"><div class="package-card__content"><span class="mono">${p.resi}</span> — ${escapeHtml(p.nama || '')}</div></div>`).join('');
  }

  function renderPickupCard(p) {
    const el = createEl('div', 'package-card');
    el.innerHTML = `<div class="package-card__content">
      <span class="package-card__resi mono">${escapeHtml(p.resi)}</span>
      <p class="package-card__name">${escapeHtml(p.nama || '')}</p>
      <p class="package-card__address">${escapeHtml(p.alamat || '')}</p>
    </div>`;
    return el;
  }

  return { init };
})();
Router.register('pickup', PickupController);
