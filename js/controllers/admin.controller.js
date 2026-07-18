/* =====================================================================
   Admin Controllers — Dashboard, Data Kurir, Data Paket, Monitoring
===================================================================== */
const AdminDashboardController = (() => {
  async function init(container) {
    const users = await DB.getAll(STORES.USERS);
    const packages = await PackageService.getAll();
    const pickup = await DB.getAll(STORES.PICKUP);
    const returns = await DB.getAll(STORES.RETURNS);
    const todayStr = new Date().toISOString().slice(0, 10);

    qs('#admin-total-kurir', container).textContent = users.filter((u) => u.role === 'kurir').length;
    qs('#admin-total-paket', container).textContent = packages.length;
    qs('#admin-total-pickup', container).textContent = pickup.filter((p) => (p.pickedAt || '').slice(0, 10) === todayStr).length;
    qs('#admin-total-return', container).textContent = returns.filter((r) => (r.createdAt || '').slice(0, 10) === todayStr).length;

    delegate(container, 'click', '[data-route]', (e, el) => Router.goTo(el.dataset.route));
  }
  return { init };
})();
Router.register('admin-dashboard', AdminDashboardController);

const AdminKurirController = (() => {
  async function init(container) {
    const render = (list) => {
      qs('#table-kurir-body', container).innerHTML = list.map((u) => `
        <tr>
          <td class="mono">${(u.courierId || u.id || '').slice(0, 8)}</td>
          <td>${escapeHtml(u.name || u.username)}</td>
          <td><span class="status-pill" data-status="${u.online ? 'done' : 'failed'}">${u.online ? 'Online' : 'Offline'}</span></td>
          <td>${(u.rating ?? 4.8).toFixed(1)}</td>
          <td>${u.totalPackages ?? 0}</td>
          <td></td>
        </tr>`).join('') || '<tr><td colspan="6">Belum ada data kurir</td></tr>';
    };
    const all = (await DB.getAll(STORES.USERS)).filter((u) => u.role === 'kurir');
    render(all);
    on(qs('#input-search-kurir', container), 'input', (e) => {
      const q = e.target.value.toLowerCase();
      render(all.filter((u) => (u.name || u.username || '').toLowerCase().includes(q)));
    });
  }
  return { init };
})();
Router.register('admin-kurir', AdminKurirController);

const AdminPaketController = (() => {
  async function init(container) {
    const users = await DB.getAll(STORES.USERS);
    const render = (list) => {
      qs('#table-paket-body', container).innerHTML = list.map((p) => {
        const kurir = users.find((u) => u.id === p.kurirId);
        return `<tr>
          <td class="mono">${escapeHtml(p.resi)}</td>
          <td>${escapeHtml(p.nama || '')}</td>
          <td>${escapeHtml(kurir ? (kurir.name || kurir.username) : '-')}</td>
          <td><span class="status-pill" data-status="${p.status}">${STATUS_LABELS[p.status] || p.status}</span></td>
          <td>${formatDate(p.tanggal)}</td>
        </tr>`;
      }).join('') || '<tr><td colspan="5">Belum ada data paket</td></tr>';
    };
    const all = await PackageService.getAll();
    render(all);
    on(qs('#input-search-admin-paket', container), 'input', async (e) => render(await PackageService.search(e.target.value)));
  }
  return { init };
})();
Router.register('admin-paket', AdminPaketController);

const AdminMonitoringController = (() => {
  async function init(container) {
    const users = (await DB.getAll(STORES.USERS)).filter((u) => u.role === 'kurir');
    qs('#admin-monitoring-list', container).innerHTML = users.map((u) => `
      <div class="courier-item card" style="display:flex;align-items:center;gap:12px;">
        <img class="avatar" src="${u.avatar || 'assets/images/avatar-placeholder.svg'}" alt="">
        <div style="flex:1;">
          <p style="font-weight:700;">${escapeHtml(u.name || u.username)}</p>
          <p style="font-size:12px;color:var(--color-on-surface-variant);">${u.lastLocationLabel || 'Lokasi tidak tersedia'}</p>
        </div>
        <span class="status-pill" data-status="${u.online ? 'done' : 'failed'}">${u.online ? 'Online' : 'Offline'}</span>
      </div>`).join('') || '<p class="empty-state">Belum ada kurir aktif</p>';
  }
  return { init };
})();
Router.register('admin-monitoring', AdminMonitoringController);
