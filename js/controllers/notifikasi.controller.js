/* ===== Notifikasi Controller ===== */
const NotifikasiController = (() => {
  async function init(container) {
    await render(container);
    on(qs('#btn-mark-all-read', container), 'click', async () => {
      await NotificationService.markAllRead();
      render(container);
    });
  }

  async function render(container) {
    const all = (await DB.getAll(STORES.NOTIFICATIONS)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    qs('#notif-count-label', container).textContent = `${all.length} notifikasi`;
    const listEl = qs('#notif-list', container);
    qsa('.notif-item', listEl).forEach((el) => el.remove());
    if (!all.length) { show(qs('#notif-empty', container)); return; }
    hide(qs('#notif-empty', container));
    all.forEach((n) => {
      const btn = createEl('button', 'notif-item', '');
      btn.dataset.notifId = n.id;
      btn.type = 'button';
      btn.innerHTML = `
        <span class="notif-item__dot" style="visibility:${n.read ? 'hidden' : 'visible'}"></span>
        <span class="material-icon notif-item__icon" aria-hidden="true">${n.icon || 'notifications'}</span>
        <span class="notif-item__body">
          <span class="notif-item__title">${escapeHtml(n.title)}</span>
          <span class="notif-item__desc">${escapeHtml(n.desc || '')}</span>
          <span class="notif-item__time">${timeAgo(n.createdAt)}</span>
        </span>`;
      listEl.appendChild(btn);
    });
  }
  return { init };
})();
Router.register('notifikasi', NotifikasiController);
