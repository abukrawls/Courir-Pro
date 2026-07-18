/* ===== Format Helpers ===== */
function formatCurrency(value) {
  const n = Number(value) || 0;
  return 'Rp ' + n.toLocaleString('id-ID');
}
function formatDate(iso, opts) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', opts || { day:'2-digit', month:'short', year:'numeric' });
}
function formatTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
}
function formatDateTime(iso) {
  if (!iso) return '-';
  return `${formatDate(iso)} ${formatTime(iso)}`;
}
function timeAgo(iso) {
  if (!iso) return '-';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'Baru saja';
  if (min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  return `${day} hari lalu`;
}
function formatPhone(phone) {
  if (!phone) return '-';
  let p = String(phone).replace(/[^\d+]/g, '');
  if (p.startsWith('0')) p = '62' + p.slice(1);
  if (!p.startsWith('+')) p = '+' + p;
  return p;
}
