/* ===== Absensi Controller ===== */
const AbsensiController = (() => {
  let clockInterval = null;
  let stream = null;
  let capturedPhoto = null;

  async function init(container) {
    tickClock(container);
    clockInterval = setInterval(() => tickClock(container), 1000);
    window.addEventListener('hashchange', cleanup, { once: true });

    const user = State.get('currentUser');
    const today = await AttendanceService.getToday(user.id);
    renderStatus(container, today);

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      qs('#absensi-camera', container).srcObject = stream;
    } catch (e) { Toast.show('Tidak bisa mengakses kamera', 'error'); }

    GpsService.getCurrentPosition()
      .then((pos) => { qs('#absensi-location-label', container).textContent = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`; qs('#absensi-location-label', container).dataset.pos = JSON.stringify(pos); })
      .catch(() => { qs('#absensi-location-label', container).textContent = 'Lokasi tidak tersedia'; });

    on(qs('#btn-checkin', container), 'click', () => submit(container, 'in'));
    on(qs('#btn-checkout', container), 'click', () => submit(container, 'out'));

    renderHistory(container, user.id);
  }

  function tickClock(container) {
    const el = qs('#absensi-clock', container);
    if (!el) { clearInterval(clockInterval); return; }
    const now = new Date();
    el.textContent = now.toLocaleTimeString('id-ID');
    qs('#absensi-date', container).textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  function renderStatus(container, record) {
    const label = qs('#absensi-status-label', container);
    if (!record) { label.textContent = 'Belum Check In'; show(qs('#btn-checkin', container)); hide(qs('#btn-checkout', container)); return; }
    if (record.checkIn && !record.checkOut) {
      label.textContent = 'Sudah Check In'; hide(qs('#btn-checkin', container)); show(qs('#btn-checkout', container));
      qs('#absensi-checkin-time', container).hidden = false;
      qs('#absensi-checkin-time span', container).textContent = formatTime(record.checkIn);
      container.dataset.attendanceId = record.id;
    }
    if (record.checkOut) {
      label.textContent = 'Selesai Bertugas'; hide(qs('#btn-checkin', container)); hide(qs('#btn-checkout', container));
    }
  }

  function capturePhoto(container) {
    const video = qs('#absensi-camera', container);
    const canvas = qs('#absensi-canvas', container);
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  async function submit(container, type) {
    const photo = capturePhoto(container);
    const gps = JSON.parse(qs('#absensi-location-label', container).dataset.pos || '{}');
    const user = State.get('currentUser');
    if (type === 'in') {
      const record = await AttendanceService.checkIn(user.id, { photo, gps });
      renderStatus(container, record);
      Toast.show('Check In berhasil', 'success');
    } else {
      const id = container.dataset.attendanceId;
      const record = await AttendanceService.checkOut(id, { photo, gps });
      renderStatus(container, record);
      Toast.show('Check Out berhasil', 'success');
    }
    renderHistory(container, user.id);
  }

  async function renderHistory(container, userId) {
    const history = await AttendanceService.getHistory(userId);
    qs('#absensi-history', container).innerHTML = history.slice(0, 10).map((h) =>
      `<div>${formatDate(h.date)} — In ${formatTime(h.checkIn)} / Out ${h.checkOut ? formatTime(h.checkOut) : '-'}</div>`
    ).join('') || '<p class="empty-state">Belum ada riwayat</p>';
  }

  function cleanup() { clearInterval(clockInterval); if (stream) stream.getTracks().forEach((t) => t.stop()); }

  return { init };
})();
Router.register('absensi', AbsensiController);
