/* =====================================================================
   Scanner Service — Barcode/QR via BarcodeDetector API (native browser).
   Fallback: jika tidak didukung, UI mengarahkan ke input manual.
===================================================================== */
const ScannerService = (() => {
  let stream = null;
  let detector = null;
  let scanning = false;
  let torchTrack = null;

  function isSupported() { return 'BarcodeDetector' in window; }

  async function start(videoEl, onDetect, { continuous = false } = {}) {
    if (!isSupported()) throw new Error('Perangkat/browser tidak mendukung pemindaian native.');
    detector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13'] });
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    videoEl.srcObject = stream;
    await videoEl.play();
    torchTrack = stream.getVideoTracks()[0];
    scanning = true;
    loop(videoEl, onDetect, continuous);
  }

  async function loop(videoEl, onDetect, continuous) {
    if (!scanning) return;
    try {
      const codes = await detector.detect(videoEl);
      if (codes.length > 0) {
        onDetect(codes[0].rawValue);
        feedback();
        if (!continuous) { stop(); return; }
      }
    } catch (e) { /* frame belum siap, abaikan */ }
    requestAnimationFrame(() => loop(videoEl, onDetect, continuous));
  }

  function feedback() {
    if (navigator.vibrate) navigator.vibrate(120);
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      osc.frequency.value = 880;
      osc.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  }

  async function toggleTorch(on) {
    if (!torchTrack) return;
    try { await torchTrack.applyConstraints({ advanced: [{ torch: on }] }); } catch (e) { console.warn('Flash tidak didukung perangkat ini.'); }
  }

  function stop() {
    scanning = false;
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
  }

  return { isSupported, start, stop, toggleTorch, feedback };
})();
