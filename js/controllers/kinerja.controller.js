/* ===== Kinerja Controller ===== */
const KinerjaController = (() => {
  async function init(container) {
    const summary = await ReportService.getSummary();
    qs('#k-total', container).textContent = summary.total;
    qs('#k-success', container).textContent = summary.success;
    qs('#k-failed', container).textContent = summary.failed;
    qs('#k-pending', container).textContent = summary.pending;
    qs('#k-pickup', container).textContent = summary.pickup;
    qs('#k-return', container).textContent = summary.return;
    qs('#k-percentage', container).textContent = summary.percentage + '%';
    drawChart(qs('#kinerja-chart-canvas', container), summary);
  }

  function drawChart(canvas, summary) {
    if (!canvas) return;
    canvas.width = canvas.offsetWidth; canvas.height = 180;
    const ctx = canvas.getContext('2d');
    const bars = [
      { label: 'Berhasil', value: summary.success, color: '#1E8E3E' },
      { label: 'Gagal', value: summary.failed, color: '#D93025' },
      { label: 'Pending', value: summary.pending, color: '#1967D2' },
      { label: 'Return', value: summary.return, color: '#B9770E' },
    ];
    const max = Math.max(1, ...bars.map((b) => b.value));
    const barWidth = canvas.width / bars.length - 20;
    bars.forEach((b, i) => {
      const h = (b.value / max) * (canvas.height - 30);
      const x = i * (canvas.width / bars.length) + 10;
      ctx.fillStyle = b.color;
      ctx.fillRect(x, canvas.height - h - 20, barWidth, h);
      ctx.fillStyle = '#44474A';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, x + barWidth / 2, canvas.height - 5);
      ctx.fillText(String(b.value), x + barWidth / 2, canvas.height - h - 26);
    });
  }

  return { init };
})();
Router.register('kinerja', KinerjaController);
