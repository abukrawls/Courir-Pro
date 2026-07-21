/* ===== Dashboard Controller ===== */
const DashboardController = (() => {
  async function init(container) {
    const user = State.get('currentUser');
    if (!user) return;

    qs('#dash-name').textContent = user.name || user.username;
    qs('#dash-courier-id').textContent = user.courierId || user.id?.slice(0, 8) || '-';
    qs('#dash-rating').textContent = (user.rating ?? 4.8).toFixed(1);
    if (user.avatar) qs('#dash-avatar').src = user.avatar;

    const onlineBtn = qs('#btn-toggle-online');
    let isOnline = (await DB.getSetting('courierOnline')) ?? false;
    renderOnlineToggle(isOnline);
    on(onlineBtn, 'click', async () => {
      isOnline = !isOnline;
      await DB.setSetting('courierOnline', isOnline);
      renderOnlineToggle(isOnline);
    });
    function renderOnlineToggle(state) {
      onlineBtn.setAttribute('aria-checked', String(state));
      qs('#dash-online-label').textContent = state ? 'Online' : 'Offline';
    }

    // Status sinyal
    qs('#status-internet-label').textContent = navigator.onLine ? 'Online' : 'Offline';
    if (navigator.getBattery) {
      navigator.getBattery().then((b) => { qs('#status-battery-label').textContent = Math.round(b.level * 100) + '%'; });
    } else {
      qs('#status-battery-label').textContent = '-';
    }
    GpsService.getCurrentPosition()
      .then(() => { qs('#status-gps-label').textContent = 'GPS aktif'; })
      .catch(() => { qs('#status-gps-label').textContent = 'GPS nonaktif'; });

    // Statistik & target
    const packages = await PackageService.getAll();
    const todayStr = new Date().toISOString().slice(0, 10);
    const todays = packages.filter((p) => (p.tanggal || '').slice(0, 10) === todayStr);
    const done = todays.filter((p) => p.status === 'done').length;
    const target = user.dailyTarget || todays.length || 0;
    qs('#dash-progress-count').textContent = done;
    qs('#dash-target-count').textContent = target;
    const pct = target ? Math.round((done / target) * 100) : 0;
    qs('#dash-progress-fill').style.width = pct + '%';
    qs('#dash-progress-bar').setAttribute('aria-valuenow', pct);

    qs('#stat-total').textContent = packages.length;
    qs('#stat-success').textContent = packages.filter((p) => p.status === 'done').length;
    qs('#stat-pending').textContent = packages.filter((p) => p.status === 'todo').length;
    qs('#stat-failed').textContent = packages.filter((p) => p.status === 'failed').length;

    // Paket prioritas
    const priorityList = qs('#dash-priority-list');
    const priority = packages.filter((p) => p.prioritas && p.status !== 'done').slice(0, 5);
    priorityList.innerHTML = '';
    if (!priority.length) {
      priorityList.innerHTML = '<div class="empty-state"><span class="material-icon" aria-hidden="true">task_alt</span><p>Tidak ada paket prioritas</p></div>';
    } else {
      priority.forEach((p) => priorityList.appendChild(renderPackageCard(p)));
    }

    delegate(container, 'click', '[data-route]', (e, target) => Router.goTo(target.dataset.route));
    delegate(priorityList, 'click', '.package-card', (e, card) => Router.goTo('package-detail', { id: card.dataset.packageId }));
  }

  function renderPackageCard(p) {
    const el = document.createElement('article');
    el.className = 'package-card';
    el.dataset.packageId = p.id;
    const codText = p.cod && p.cod > 0 ? `COD: ${formatCurrency(p.cod)}` : 'Non COD';
    el.innerHTML = `
      <div class="package-card__content">
        <div class="package-card__top">
          <span class="package-card__resi mono">${escapeHtml(p.resi)}</span>
          <button class="icon-btn package-card__copy" type="button" aria-label="Salin resi">
            <span class="material-icon" aria-hidden="true">content_copy</span>
          </button>
        </div>
        <div class="package-card__address-row">
          <span class="material-icon package-card__pin" aria-hidden="true">location_on</span>
          <p class="package-card__address">${escapeHtml(p.alamat)}</p>
        </div>
        <p class="package-card__name">${escapeHtml(p.nama)}</p>
        <p class="package-card__cod ${p.cod ? 'has-cod' : ''}">${codText}</p>
        <div class="package-card__badges">
          ${p.cod ? '<span class="badge badge--cod-check">COD Cek Dulu</span>' : ''}
          ${p.prioritas ? '<span class="badge badge--priority">Prioritas</span>' : ''}
        </div>
        <div class="package-card__bottom">
          <span class="status-pill" data-status="${p.status}">${STATUS_LABELS[p.status] || p.status}</span>
          <span class="package-card__time">${p.jam || ''}</span>
        </div>
      </div>`;
    on(el.querySelector('.package-card__copy'), 'click', async (e) => {
      e.stopPropagation();
      try { await navigator.clipboard.writeText(p.resi); Toast.show('Resi disalin', 'success'); }
      catch (err) { Toast.show('Gagal menyalin resi', 'error'); }
    });
    return el;
  }

  return { init, renderPackageCard };
})();
Router.register('dashboard', DashboardController);
