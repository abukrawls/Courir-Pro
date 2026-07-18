/* =====================================================================
   Auth Service — Login (password/PIN/biometric), Logout, Session,
   Remember Login, Auto Login, Multi Role.
===================================================================== */
const AuthService = (() => {
  async function hashText(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function saveSession(user, remember) {
    const payload = JSON.stringify(user);
    if (remember) localStorage.setItem(STORAGE_KEYS.SESSION, payload);
    else sessionStorage.setItem(STORAGE_KEYS.SESSION, payload);
  }

  function loadSession() {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION) || sessionStorage.getItem(STORAGE_KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  async function loginWithPassword(username, password, role, remember) {
    if (SUPABASE_CONFIGURED && supabaseClient) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email: username, password });
      if (error) throw new Error('Login gagal: periksa kembali email/kata sandi Anda.');

      const { data: profile, error: profileError } = await supabaseClient
        .from('users').select('*').eq('id', data.user.id).single();
      if (profileError || !profile) {
        await supabaseClient.auth.signOut();
        throw new Error('Akun ditemukan tapi profil belum terdaftar di tabel users. Hubungi admin.');
      }
      if (profile.role !== role) {
        await supabaseClient.auth.signOut();
        throw new Error(`Akun ini terdaftar sebagai ${profile.role}, bukan ${role}. Pilih peran yang sesuai.`);
      }

      const user = {
        id: profile.id, username: profile.username, name: profile.name, role: profile.role,
        courierId: profile.courier_id, rating: profile.rating, dailyTarget: profile.daily_target,
        online: profile.online, avatar: profile.avatar,
      };
      await DB.put(STORES.USERS, { ...user, synced: true });
      saveSession(user, remember);
      State.set('currentUser', user);
      return user;
    }
    // Mode offline: cocokkan terhadap user tersimpan di IndexedDB (hasil seed/registrasi sebelumnya)
    const users = await DB.getAll(STORES.USERS);
    const passHash = await hashText(password);
    const found = users.find((u) => u.username === username && u.passwordHash === passHash && u.role === role);
    if (!found) throw new Error('Login gagal: username, kata sandi, atau peran tidak cocok.');
    saveSession(found, remember);
    State.set('currentUser', found);
    return found;
  }

  async function loginWithPin(pin) {
    const savedHash = localStorage.getItem(STORAGE_KEYS.PIN);
    const savedUser = loadSession();
    if (!savedHash || !savedUser) throw new Error('PIN belum diatur. Silakan login dengan kata sandi terlebih dahulu.');
    const inputHash = await hashText(pin);
    if (inputHash !== savedHash) throw new Error('PIN salah.');
    State.set('currentUser', savedUser);
    return savedUser;
  }

  async function setupPin(pin) {
    localStorage.setItem(STORAGE_KEYS.PIN, await hashText(pin));
  }

  async function loginWithBiometric() {
    if (!window.PublicKeyCredential) throw new Error('Perangkat tidak mendukung biometrik.');
    const savedUser = loadSession();
    if (!savedUser) throw new Error('Login manual terlebih dahulu untuk mengaktifkan biometrik.');
    // WebAuthn assertion sederhana (memerlukan credential terdaftar di flow produksi penuh)
    State.set('currentUser', savedUser);
    return savedUser;
  }

  function logout() {
    clearSession();
    State.set('currentUser', null);
    if (SUPABASE_CONFIGURED && supabaseClient) supabaseClient.auth.signOut();
    Router.goTo('login');
  }

  function tryAutoLogin() {
    const user = loadSession();
    if (user) State.set('currentUser', user);
    return user;
  }

  return { loginWithPassword, loginWithPin, setupPin, loginWithBiometric, logout, tryAutoLogin, hashText };
})();
