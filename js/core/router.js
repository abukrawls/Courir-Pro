/* =====================================================================
   Router SPA berbasis hash (#/route). Memuat pages/<name>.html
   ke #page-container lalu menjalankan controller init masing-masing.
===================================================================== */
const Router = (() => {
  const pageCache = {};
  const controllers = {}; // didaftarkan oleh tiap *.controller.js

  function register(routeName, controller) { controllers[routeName] = controller; }

  function getRouteFromHash() {
    const hash = location.hash.replace(/^#\/?/, '');
    return hash || DEFAULT_ROUTE;
  }

  async function fetchPage(routeConf) {
    if (pageCache[routeConf.page]) return pageCache[routeConf.page];
    const res = await fetch(`pages/${routeConf.page}`);
    if (!res.ok) throw new Error('Gagal memuat halaman: ' + routeConf.page);
    const html = await res.text();
    pageCache[routeConf.page] = html;
    return html;
  }

  function applyShellVisibility(routeConf) {
    const header = qs('#app-header');
    const bottomNav = qs('#bottom-nav');
    header.hidden = !routeConf.header;
    bottomNav.hidden = !routeConf.bottomNav;
    qs('#app-header-title').textContent = routeConf.title || APP.NAME;
    qsa('.bottom-nav__item').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.route === State.get('currentRoute'));
    });
  }

  async function navigate(routeName, params = {}) {
    const routeConf = ROUTES[routeName];
    if (!routeConf) { console.warn('Route tidak ditemukan:', routeName); return navigate(DEFAULT_ROUTE); }

    const user = State.get('currentUser');
    if (routeConf.auth && !user) { location.hash = '#/login'; return; }
    if (routeConf.roles && user && !routeConf.roles.includes(user.role)) {
      Toast.show('Kamu tidak punya akses ke halaman ini', 'error');
      return;
    }
    if (!routeConf.auth && user && routeName === 'login') {
      return navigate(DEFAULT_ROUTE);
    }

    Loader.show();
    try {
      const html = await fetchPage(routeConf);
      const container = qs('#page-container');
      container.innerHTML = html;
      State.set('currentRoute', routeName);
      State.set('routeParams', params);
      applyShellVisibility(routeConf);
      if (controllers[routeName] && typeof controllers[routeName].init === 'function') {
        await controllers[routeName].init(container, params);
      }
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      Toast.show('Gagal memuat halaman', 'error');
    } finally {
      Loader.hide();
    }
  }

  function goTo(routeName, params) {
    const q = params && Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    location.hash = `#/${routeName}${q}`;
  }

  function parseParams() {
    const [, query] = location.hash.split('?');
    return query ? Object.fromEntries(new URLSearchParams(query)) : {};
  }

  function start() {
    window.addEventListener('hashchange', () => navigate(getRouteFromHash(), parseParams()));
    navigate(getRouteFromHash(), parseParams());
  }

  return { register, navigate, goTo, start };
})();

/* ===== Toast & Loader singleton (dipakai router + services) ===== */
const Toast = (() => {
  function show(message, type = 'default') {
    const container = qs('#toast-container');
    const el = createEl('div', `toast toast--${type}`, escapeHtml(message));
    container.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
  return { show };
})();

const Loader = (() => {
  let count = 0;
  function show() { count++; qs('#global-loader').hidden = false; }
  function hide() { count = Math.max(0, count - 1); if (count === 0) qs('#global-loader').hidden = true; }
  return { show, hide };
})();
