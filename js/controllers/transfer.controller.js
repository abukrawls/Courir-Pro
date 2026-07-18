/* ===== Transfer Paket Controller ===== */
const TransferController = (() => {
  let selectedCourier = null;
  let pendingResi = null;

  async function init(container, params) {
    pendingResi = params.resi || null;
    const users = (await DB.getAll(STORES.USERS)).filter((u) => u.role === 'kurir');
    renderCourierList(container, users);

    on(qs('#input-search-courier', container), 'input', (e) => {
      const q = e.target.value.toLowerCase();
      renderCourierList(container, users.filter((u) => (u.name || '').toLowerCase().includes(q)));
    });

    delegate(container, 'click', '.courier-item', (e, item) => {
      selectedCourier = users.find((u) => u.id === item.dataset.userId);
      qs('#transfer-target-name', container).textContent = selectedCourier.name;
      qs('#transfer-resi', container).textContent = pendingResi || '-';
      show(qs('#form-transfer', container));
    });

    on(qs('#form-transfer', container), 'submit', async (e) => {
      e.preventDefault();
      const record = { id: crypto.randomUUID(), resi: pendingResi, toUser: selectedCourier.id, notes: qs('#transfer-notes').value, at: new Date().toISOString(), synced: false };
      await DB.put(STORES.HISTORY, record);
      Toast.show(`Paket ditransfer ke ${selectedCourier.name}`, 'success');
      Router.goTo('deliveries');
    });

    renderHistory(container);
  }

  function renderCourierList(container, users) {
    const listEl = qs('#courier-list', container);
    listEl.innerHTML = users.map((u) => `
      <button class="courier-item card" data-user-id="${u.id}" type="button" style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;">
        <img class="avatar" src="${u.avatar || 'assets/images/avatar-placeholder.svg'}" alt="">
        <span>${escapeHtml(u.name)}</span>
      </button>`).join('') || '<p class="empty-state">Kurir tidak ditemukan</p>';
  }

  async function renderHistory(container) {
    const all = await DB.getAll(STORES.HISTORY);
    qs('#transfer-history', container).innerHTML = all.filter((h) => h.toUser).map((h) => `<div>${h.resi} — ${formatDateTime(h.at)}</div>`).join('') || '<p class="empty-state">Belum ada transfer</p>';
  }

  return { init };
})();
Router.register('transfer', TransferController);
