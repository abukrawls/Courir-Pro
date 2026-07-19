/* ===== Setting Controller ===== */
const SettingController = (() => {
  async function init(container) {
    const settings = (await DB.getSetting('appSettings')) || {};

    initSwitch(qs('#switch-dark-mode', container), settings.darkMode, async (val) => {
      document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light');
      await saveSetting('darkMode', val);
    });
    document.documentElement.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light');

    if (settings.language) qs('#select-language', container).value = settings.language;
    on(qs('#select-language', container), 'change', (e) => saveSetting('language', e.target.value));

    if (settings.fontSize) qs('#select-font-size', container).value = settings.fontSize;
    on(qs('#select-font-size', container), 'change', (e) => {
      saveSetting('fontSize', e.target.value);
      document.body.style.fontSize = { small: '13px', medium: '15px', large: '17px' }[e.target.value];
    });

    ['autofocus', 'autoscan', 'vibrate', 'sound', 'autosync', 'biometric'].forEach((key) => {
      initSwitch(qs(`#switch-${key}`, container), settings[key] ?? true, (val) => saveSetting(key, val));
    });

    const perm = await NotificationService.requestPermission().catch(() => 'unsupported');
    qs('#setting-gps-status', container).textContent = perm === 'granted' ? 'Diizinkan' : 'Belum diizinkan';

    const lastSync = await DB.getSetting('lastSyncAt');
    qs('#setting-last-sync', container).textContent = lastSync ? formatDateTime(lastSync) : 'Belum pernah';
    on(qs('#btn-sync-now', container), 'click', async () => {
      Loader.show();
      try {
        await SyncEngine.fullSync();
        Toast.show('Sinkronisasi selesai', 'success');
      } catch (err) {
        Toast.show('Sinkronisasi gagal: ' + err.message, 'error');
      } finally {
        Loader.hide();
      }
    });

    on(qs('#btn-change-pin', container), 'click', async () => {
      const pin = prompt('Masukkan PIN baru (6 digit):');
      if (pin && pin.length === 6) { await AuthService.setupPin(pin); Toast.show('PIN berhasil diubah', 'success'); }
    });

    on(qs('#btn-logout-setting', container), 'click', () => AuthService.logout());
  }

  function initSwitch(el, initial, onChange) {
    if (!el) return;
    el.setAttribute('aria-checked', String(!!initial));
    on(el, 'click', () => {
      const next = el.getAttribute('aria-checked') !== 'true';
      el.setAttribute('aria-checked', String(next));
      onChange(next);
    });
  }

  async function saveSetting(key, value) {
    const settings = (await DB.getSetting('appSettings')) || {};
    settings[key] = value;
    await DB.setSetting('appSettings', settings);
  }

  return { init };
})();
Router.register('setting', SettingController);
