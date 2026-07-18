/* ===== Login Controller ===== */
const LoginController = (() => {
  function init(container) {
    qs('#login-year').textContent = new Date().getFullYear();

    // Tab metode login
    qsa('.login-tab', container).forEach((tab) => on(tab, 'click', () => {
      qsa('.login-tab', container).forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active'); tab.setAttribute('aria-selected', 'true');
      const method = tab.dataset.method;
      hide(qs('#form-login-password')); hide(qs('#form-login-pin')); hide(qs('#btn-login-biometric'));
      if (method === 'password') show(qs('#form-login-password'));
      if (method === 'pin') show(qs('#form-login-pin'));
      if (method === 'biometric') show(qs('#btn-login-biometric'));
    }));

    if (window.PublicKeyCredential) show(qs('#btn-login-biometric'));

    on(qs('#btn-toggle-password'), 'click', () => {
      const input = qs('#input-password');
      input.type = input.type === 'password' ? 'text' : 'password';
    });

    on(qs('#form-login-password'), 'submit', async (e) => {
      e.preventDefault();
      const username = qs('#input-username').value.trim();
      const password = qs('#input-password').value;
      const role = qs('#input-role').value;
      const remember = qs('#input-remember').checked;
      const errors = validateForm([
        { name: 'username', value: username, rules: [{ test: isRequired, message: 'Wajib diisi' }] },
        { name: 'password', value: password, rules: [{ test: (v) => minLength(v, 6), message: 'Minimal 6 karakter' }] },
        { name: 'role', value: role, rules: [{ test: isRequired, message: 'Pilih peran' }] },
      ]);
      hide(qs('#login-error'));
      if (errors.length) { qs('#login-error').textContent = errors[0].message; show(qs('#login-error')); return; }

      const btn = qs('#btn-login-submit');
      btn.disabled = true; btn.textContent = 'Memproses...';
      try {
        await AuthService.loginWithPassword(username, password, role, remember);
        Router.goTo(DEFAULT_ROUTE);
      } catch (err) {
        qs('#login-error').textContent = err.message; show(qs('#login-error'));
      } finally {
        btn.disabled = false; btn.textContent = 'Masuk';
      }
    });

    // PIN input auto-advance
    const pinDigits = qsa('.pin-digit', container);
    pinDigits.forEach((input, idx) => {
      on(input, 'input', () => { if (input.value && pinDigits[idx + 1]) pinDigits[idx + 1].focus(); });
    });
    on(qs('#form-login-pin'), 'submit', async (e) => {
      e.preventDefault();
      const pin = pinDigits.map((d) => d.value).join('');
      if (pin.length !== 6) { Toast.show('PIN harus 6 digit', 'error'); return; }
      try { await AuthService.loginWithPin(pin); Router.goTo(DEFAULT_ROUTE); }
      catch (err) { Toast.show(err.message, 'error'); }
    });

    on(qs('#btn-login-biometric'), 'click', async () => {
      try { await AuthService.loginWithBiometric(); Router.goTo(DEFAULT_ROUTE); }
      catch (err) { Toast.show(err.message, 'error'); }
    });

    on(qs('#btn-forgot-password'), 'click', () => Toast.show('Hubungi admin untuk reset kata sandi.'));
  }
  return { init };
})();
Router.register('login', LoginController);
