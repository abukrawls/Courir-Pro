/* =====================================================================
   Notification Service — realtime (Supabase channel jika tersedia),
   push browser notification, badge counter.
===================================================================== */
const NotificationService = (() => {
  async function requestPermission() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'default') return Notification.requestPermission();
    return Notification.permission;
  }

  function pushLocal(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'assets/icons/icon-192.png' });
    }
  }

  async function add(notif) {
    const record = { id: crypto.randomUUID(), read: false, createdAt: new Date().toISOString(), ...notif, synced: false };
    await DB.put(STORES.NOTIFICATIONS, record);
    updateBadge();
    return record;
  }

  async function markAllRead() {
    const all = await DB.getAll(STORES.NOTIFICATIONS);
    await Promise.all(all.map((n) => DB.put(STORES.NOTIFICATIONS, { ...n, read: true })));
    updateBadge();
  }

  async function updateBadge() {
    const all = await DB.getAll(STORES.NOTIFICATIONS);
    const unread = all.filter((n) => !n.read).length;
    const badge = qs('#badge-notification');
    if (badge) { badge.hidden = unread === 0; badge.textContent = unread > 99 ? '99+' : unread; }
  }

  function subscribeRealtime() {
    if (!SUPABASE_CONFIGURED || !supabaseClient) return;
    supabaseClient.channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        add(payload.new);
        pushLocal(payload.new.title, payload.new.desc);
      })
      .subscribe();
  }

  return { requestPermission, pushLocal, add, markAllRead, updateBadge, subscribeRealtime };
})();
