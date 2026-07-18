/* =====================================================================
   Report Service — agregasi kinerja & laporan, export CSV (kompatibel
   Excel) dan cetak PDF via window.print().
===================================================================== */
const ReportService = (() => {
  function withinRange(dateStr, start, end) {
    const d = new Date(dateStr).getTime();
    return d >= new Date(start).getTime() && d <= new Date(end + 'T23:59:59').getTime();
  }

  async function getSummary(start, end) {
    const packages = await PackageService.getAll();
    const filtered = start && end ? packages.filter((p) => withinRange(p.tanggal || p.updatedAt, start, end)) : packages;
    const count = (s) => filtered.filter((p) => p.status === s).length;
    return {
      total: filtered.length,
      success: count('done'),
      failed: count('failed'),
      pending: count('todo') + count('postponed'),
      pickup: count('pickup'),
      return: count('return'),
      percentage: filtered.length ? Math.round((count('done') / filtered.length) * 100) : 0,
      rows: filtered,
    };
  }

  function exportCsv(rows, filename = 'laporan-courier-pro.csv') {
    const header = ['Resi', 'Nama', 'Status', 'Tanggal', 'Jam'];
    const lines = [header.join(',')].concat(
      rows.map((r) => [r.resi, r.nama, STATUS_LABELS[r.status] || r.status, r.tanggal || '', r.jam || ''].map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
    );
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function printReport() { window.print(); }

  return { getSummary, exportCsv, printReport };
})();
