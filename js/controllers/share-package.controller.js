/* =====================================================================
   Share Package Controller — Import paket titipan dari screenshot (OCR)
   atau input manual. OCR jalan di browser (Tesseract.js, dimuat dinamis
   dari CDN, non-blocking — kalau gagal dimuat, upload screenshot
   dinonaktifkan tapi tambah manual tetap bisa dipakai).
   Field wajib: resi, alamat, nama, cod. No. HP opsional.
===================================================================== */
const SharePackageController = (() => {
  let items = []; // { id, resi, alamat, nama, cod, hp, fromOcr }
  let tesseractReady = false;
  let tesseractLoading = null;

  function loadScriptWithTimeout(src, timeoutMs) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => { script.remove(); reject(new Error('Timeout memuat ' + src)); }, timeoutMs);
      script.src = src;
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); reject(new Error('Gagal memuat ' + src)); };
      document.head.appendChild(script);
    });
  }

  async function ensureTesseract() {
    if (tesseractReady) return true;
    if (tesseractLoading) return tesseractLoading;
    tesseractLoading = (async () => {
      const sources = [
        'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
        'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js',
      ];
      for (const src of sources) {
        try {
          await loadScriptWithTimeout(src, 15000);
          if (window.Tesseract) { tesseractReady = true; return true; }
        } catch (err) {
          console.warn('[SharePackage] ' + err.message);
        }
      }
      return false;
    })();
    return tesseractLoading;
  }

  /* ===== Format ribuan dengan titik: 14708 -> "14.708" ===== */
  function formatThousands(value) {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (!digits) return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function parseThousands(str) {
    return parseInt(String(str ?? '').replace(/\./g, ''), 10) || 0;
  }

  /* ===== Parsing hasil OCR jadi data paket (heuristik, tidak sempurna) ===== */
  function parseOcrText(rawText) {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const resiRegex = /^[A-Z0-9]{8,}$/i;
    const codRegex = /cod\s*:?\s*([\d.,]+)/i;
    const skipRegex = /^(cod cek dulu|home|kantor|apartment|kos|ruko)$/i;

    const blocks = [];
    let current = null;
    for (const rawLine of lines) {
      const compact = rawLine.replace(/\s/g, '');
      if (resiRegex.test(compact) && /\d/.test(compact) && /[A-Z]/i.test(compact) && compact.length <= 20) {
        if (current) blocks.push(current);
        current = { resi: compact.toUpperCase(), bodyLines: [] };
      } else if (current) {
        current.bodyLines.push(rawLine);
      }
    }
    if (current) blocks.push(current);

    return blocks.map((b) => {
      let cod = 0;
      const bodyNoCod = [];
      b.bodyLines.forEach((l) => {
        const m = l.match(codRegex);
        if (m) cod = parseInt(m[1].replace(/[.,]/g, ''), 10) || 0;
        else if (!skipRegex.test(l)) bodyNoCod.push(l);
      });
      let nama = '';
      let alamatLines = bodyNoCod;
      if (bodyNoCod.length > 1) {
        nama = bodyNoCod[bodyNoCod.length - 1];
        alamatLines = bodyNoCod.slice(0, -1);
      }
      return {
        id: crypto.randomUUID(), resi: b.resi, alamat: alamatLines.join(', '),
        nama, cod, hp: '', fromOcr: true,
      };
    }).filter((item) => item.alamat || item.nama);
  }

  const DRAFT_KEY = 'sharePackageDraft';
  let persistTimer = null;

  function persistDraft() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => { DB.setSetting(DRAFT_KEY, items).catch((e) => console.warn('[SharePackage] gagal simpan draft:', e)); }, 400);
  }

  async function init(container) {
    items = (await DB.getSetting(DRAFT_KEY)) || []; // pulihkan draft yang belum sempat di-import
    render(container);
    if (items.length) Toast.show(`${items.length} draft titipan sebelumnya dipulihkan`, 'success');

    on(qs('#btn-pick-images', container), 'click', () => qs('#input-images', container).click());
    on(qs('#input-images', container), 'change', (e) => handleImages(container, Array.from(e.target.files)));
    on(qs('#form-manual-add', container), 'submit', (e) => handleManualAdd(container, e));
    on(qs('#btn-clear-all', container), 'click', () => { items = []; persistDraft(); render(container); });
    on(qs('#btn-import-all', container), 'click', () => handleImportAll(container));
    delegate(qs('#share-list', container), 'click', '.share-item__delete', (e, btn) => {
      const idx = qsa('.share-item', qs('#share-list', container)).indexOf(btn.closest('.share-item'));
      if (idx > -1) { items.splice(idx, 1); persistDraft(); render(container); }
    });

    // Format ribuan otomatis saat mengetik di field COD manual
    const manualCod = qs('#manual-cod', container);
    on(manualCod, 'input', (e) => {
      const caretFromEnd = e.target.value.length - e.target.selectionStart;
      e.target.value = formatThousands(e.target.value);
      e.target.selectionStart = e.target.selectionEnd = e.target.value.length - caretFromEnd;
    });
  }

  async function handleImages(container, files) {
    if (!files.length) return;
    const ready = await ensureTesseract();
    if (!ready) {
      Toast.show('Gagal memuat mesin pembaca teks (OCR). Coba lagi atau pakai tambah manual.', 'error');
      return;
    }
    const progressWrap = qs('#ocr-progress', container);
    const progressFill = qs('#ocr-progress-fill', container);
    const progressLabel = qs('#ocr-progress-label', container);
    show(progressWrap);

    for (let i = 0; i < files.length; i++) {
      progressLabel.textContent = `Memproses gambar ${i + 1}/${files.length}...`;
      progressFill.style.width = Math.round((i / files.length) * 100) + '%';
      try {
        const { data } = await Tesseract.recognize(files[i], 'ind+eng');
        const parsed = parseOcrText(data.text || '');
        items.push(...parsed);
        render(container); // progresif — langsung kelihatan tiap gambar selesai
      } catch (err) {
        console.error('[SharePackage] OCR gagal untuk gambar', i + 1, err);
        Toast.show(`Gagal membaca gambar ke-${i + 1}`, 'error');
      }
    }
    progressFill.style.width = '100%';
    progressLabel.textContent = 'Selesai.';
    setTimeout(() => hide(progressWrap), 1200);
    qs('#input-images', container).value = '';

    if (items.length) Toast.show(`${items.length} paket terbaca — cek & lengkapi sebelum import`, 'success');
  }

  function handleManualAdd(container, e) {
    e.preventDefault();
    const resi = qs('#manual-resi', container).value.trim();
    const alamat = qs('#manual-alamat', container).value.trim();
    const nama = qs('#manual-nama', container).value.trim();
    const codRaw = qs('#manual-cod', container).value;
    if (!resi || !alamat || !nama || !codRaw) {
      Toast.show('Resi, alamat, nama, dan COD wajib diisi', 'error');
      return;
    }
    items.push({
      id: crypto.randomUUID(), resi, alamat, nama,
      cod: parseThousands(codRaw),
      hp: qs('#manual-hp', container).value.trim(),
      fromOcr: false,
    });
    e.target.reset();
    render(container);
    Toast.show('Ditambahkan ke daftar', 'success');
  }

  function isComplete(item) {
    return Boolean(item.resi && item.resi.trim() && item.alamat && item.alamat.trim() && item.nama && item.nama.trim() && item.cod > 0);
  }

  function render(container) {
    const listEl = qs('#share-list', container);
    const tpl = qs('#tpl-share-item', container);
    qsa('.share-item', listEl).forEach((el) => el.remove());

    items.forEach((item) => {
      const node = tpl.content.cloneNode(true);
      const el = node.querySelector('.share-item');
      if (item.fromOcr) el.classList.add('share-item--from-ocr');
      if (!isComplete(item)) el.classList.add('share-item--incomplete');

      const resiInput = el.querySelector('.share-item__resi');
      const alamatInput = el.querySelector('.share-item__alamat');
      const namaInput = el.querySelector('.share-item__nama');
      const codInput = el.querySelector('.share-item__cod');
      const hpInput = el.querySelector('.share-item__hp');

      resiInput.value = item.resi || '';
      alamatInput.value = item.alamat || '';
      namaInput.value = item.nama || '';
      codInput.value = item.cod ? formatThousands(item.cod) : '';
      hpInput.value = item.hp || '';

      const syncIncomplete = () => el.classList.toggle('share-item--incomplete', !isComplete(item));
      resiInput.addEventListener('input', (e) => { item.resi = e.target.value; syncIncomplete(); persistDraft(); });
      alamatInput.addEventListener('input', (e) => { item.alamat = e.target.value; syncIncomplete(); persistDraft(); });
      namaInput.addEventListener('input', (e) => { item.nama = e.target.value; syncIncomplete(); persistDraft(); });
      codInput.addEventListener('input', (e) => {
        const caretFromEnd = e.target.value.length - e.target.selectionStart;
        e.target.value = formatThousands(e.target.value);
        e.target.selectionStart = e.target.selectionEnd = e.target.value.length - caretFromEnd;
        item.cod = parseThousands(e.target.value);
        syncIncomplete();
        persistDraft();
      });
      hpInput.addEventListener('input', (e) => { item.hp = e.target.value; persistDraft(); });

      listEl.appendChild(node);
    });

    qs('#share-count', container).textContent = items.length;
    qs('#btn-import-all', container).disabled = items.length === 0;
    qs('#btn-clear-all', container).hidden = items.length === 0;
    qs('#share-empty', container).hidden = items.length > 0;
    persistDraft(); // pengaman tambahan — pastikan render apa pun selalu ikut menyimpan
  }

  async function handleImportAll(container) {
    if (!items.length) return;
    const incomplete = items.filter((it) => !isComplete(it));
    if (incomplete.length) {
      render(container); // pastikan highlight merah ter-update
      Toast.show(`${incomplete.length} paket belum lengkap (resi/alamat/nama/COD) — lengkapi dulu sebelum import`, 'error');
      return;
    }

    const user = State.get('currentUser');
    const todayStr = new Date().toISOString().slice(0, 10);
    const jamStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    for (const item of items) {
      await PackageService.upsert({
        id: crypto.randomUUID(),
        resi: item.resi,
        nama: item.nama,
        hp: item.hp || '',
        alamat: item.alamat,
        cod: item.cod,
        status: 'todo',
        prioritas: false,
        jam: jamStr,
        tanggal: todayStr,
        kurirId: user?.id,
        history: [{ status: 'todo', at: new Date().toISOString() }],
        catatan: 'Paket titipan (bantu antar)',
        titipan: true,
      });
    }
    Toast.show(`${items.length} paket titipan berhasil ditambahkan ke Daftar Paket`, 'success');
    items = [];
    await DB.setSetting(DRAFT_KEY, items); // hapus draft segera, tidak nunggu debounce, karena mau pindah halaman
    Router.goTo('deliveries');
  }

  return { init };
})();
Router.register('share-package', SharePackageController);
