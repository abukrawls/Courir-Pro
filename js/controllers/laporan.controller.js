/* ===== Laporan Controller ===== */
const LaporanController = (() => {
  async function init(container) {
    await renderForPeriod(container, 'harian');

    delegate(container, 'click', '.tab', async (e, tab) => {
      qsa('.tab', container).forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('is-active'); tab.setAttribute('aria-selected', 'true');
      const period = tab.dataset.period;
      qs('#laporan-custom-range', container).hidden = period !== 'custom';
      if (period !== 'custom') await renderForPeriod(container, period);
    });

    on(qs('#btn-apply-range', container), 'click', () => {
      const start = qs('#laporan-date-start', container).value;
      const end = qs('#laporan-date-end', container).value;
      if (start && end) renderRange(container, start, end);
    });

    on(qs('#btn-export-pdf', container), 'click', () => ReportService.printReport());
    on(qs('#btn-print-report', container), 'click', () => ReportService.printReport());
    on(qs('#btn-export-excel', container), 'click', async () => {
      const summary = await ReportService.getSummary();
      ReportService.exportCsv(summary.rows);
    });
  }

  function periodRange(period) {
    const end = new Date();
    const start = new Date();
    if (period === 'harian') { /* hari ini */ }
    if (period === 'mingguan') start.setDate(end.getDate() - 7);
    if (period === 'bulanan') start.setMonth(end.getMonth() - 1);
    return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
  }

  async function renderForPeriod(container, period) {
    const [start, end] = periodRange(period);
    await renderRange(container, start, end);
  }

  async function renderRange(container, start, end) {
    const summary = await ReportService.getSummary(start, end);
    qs('#laporan-summary', container).innerHTML = `
      <div class="stat-card"><p class="stat-card__value">${summary.total}</p><p class="stat-card__label">Total</p></div>
      <div class="stat-card"><p class="stat-card__value">${summary.success}</p><p class="stat-card__label">Berhasil</p></div>
      <div class="stat-card"><p class="stat-card__value">${summary.failed}</p><p class="stat-card__label">Gagal</p></div>
      <div class="stat-card"><p class="stat-card__value">${summary.percentage}%</p><p class="stat-card__label">Persentase</p></div>`;
    qs('#laporan-table-body', container).innerHTML = summary.rows.map((r) => `
      <tr><td class="mono">${escapeHtml(r.resi)}</td><td>${escapeHtml(r.nama)}</td><td>${STATUS_LABELS[r.status] || r.status}</td><td>${formatDate(r.tanggal)}</td><td>${r.jam || '-'}</td></tr>
    `).join('') || '<tr><td colspan="5">Tidak ada data</td></tr>';
  }

  return { init };
})();
Router.register('laporan', LaporanController);
