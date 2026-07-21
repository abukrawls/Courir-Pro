/* =====================================================================
   Share Package Controller — Import paket titipan dari screenshot (OCR)
   atau input manual. OCR jalan di browser (Tesseract.js, dimuat dinamis
   dari CDN, non-blocking — kalau gagal dimuat, upload screenshot
   dinonaktifkan tapi tambah manual tetap bisa dipakai).
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

  async function init(container) {
    items = [];
    render(container);

    on(qs('#btn-pick-images', container), 'click', () => qs('#input-images', container).click());
    on(qs('#input-images', container), 'change', (e) => handleImages(container, Array.from(e.target.files)));
    on(qs('#form-manual-add', container), 'submit', (e) => handleManualAdd(container, e));
    on(qs('#btn-clear-all', container), 'click', () => { items = []; render(container); });
    on(qs('#btn-import-all', container), 'click', () => handleImportAll(container));
    delegate(qs('#share-list', container), 'click', '.share-item__delete', (e, btn) => {
      const idx = qsa('.share-item', qs('#share-list', container)).indexOf(btn.closest('.share-item'));
      if (idx > -1) { items.splice(idx, 1); render(container); }
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

    if (items.length) Toast.show(`${items.length} paket terbaca — cek & perbaiki sebelum import`, 'success');
  }

  function handleManualAdd(container, e) {
    e.preventDefault();
    const alamat = qs('#manual-alamat', container).value.trim();
    if (!alamat) return;
    items.push({
      id: crypto.randomUUID(), resi: '', alamat,
      nama: qs('#manual-nama', container).value.trim(),
      cod: Number(qs('#manual-cod', container).value) || 0,
      hp: qs('#manual-hp', container).value.trim(),
      fromOcr: false,
    });
    e.target.reset();
    render(container);
    Toast.show('Ditambahkan ke daftar', 'success');
  }

  function render(container) {
    const listEl = qs('#share-list', container);
    const tpl = qs('#tpl-share-item', container);
    qsa('.share-item', listEl).forEach((el) => el.remove());

    items.forEach((item) => {
      const node = tpl.content.cloneNode(true);
      const el = node.querySelector('.share-item');
      if (item.fromOcr) el.classList.add('share-item--from-ocr');
      el.querySelector('.share-item__resi').value = item.resi || '';
      el.querySelector('.share-item__alamat').value = item.alamat || '';
      el.querySelector('.share-item__nama').value = item.nama || '';
      el.querySelector('.share-item__cod').value = item.cod || '';
      el.querySelector('.share-item__hp').value = item.hp || '';
      // sinkronkan perubahan manual di kartu kembali ke array `items`
      el.querySelector('.share-item__resi').addEventListener('input', (e) => { item.resi = e.target.value; });
      el.querySelector('.share-item__alamat').addEventListener('input', (e) => { item.alamat = e.target.value; });
      el.querySelector('.share-item__nama').addEventListener('input', (e) => { item.nama = e.target.value; });
      el.querySelector('.share-item__cod').addEventListener('input', (e) => { item.cod = Number(e.target.value) || 0; });
      el.querySelector('.share-item__hp').addEventListener('input', (e) => { item.hp = e.target.value; });
      listEl.appendChild(node);
    });

    qs('#share-count', container).textContent = items.length;
    qs('#btn-import-all', container).disabled = items.length === 0;
    qs('#btn-clear-all', container).hidden = items.length === 0;
    qs('#share-empty', container).hidden = items.length > 0;
  }

  async function handleImportAll(container) {
    if (!items.length) return;
    const user = State.get('currentUser');
    const todayStr = new Date().toISOString().slice(0, 10);
    const jamStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    let count = 0;
    for (const item of items) {
      if (!item.alamat) continue;
      await PackageService.upsert({
        id: crypto.randomUUID(),
        resi: item.resi || ('TITIP' + Date.now().toString().slice(-8) + count),
        nama: item.nama || '-',
        hp: item.hp || '',
        alamat: item.alamat,
        cod: item.cod || 0,
        status: 'todo',
        prioritas: false,
        jam: jamStr,
        tanggal: todayStr,
        kurirId: user?.id,
        history: [{ status: 'todo', at: new Date().toISOString() }],
        catatan: 'Paket titipan (bantu antar)',
        titipan: true,
      });
      count++;
    }
    Toast.show(`${count} paket titipan berhasil ditambahkan ke Daftar Paket`, 'success');
    items = [];
    Router.goTo('deliveries');
  }

  return { init };
})();
Router.register('share-package', SharePackageController);
