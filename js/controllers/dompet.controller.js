/* ===== Dompet Controller ===== */
const DompetController = (() => {
  async function init(container) {
    const user = State.get('currentUser');
    const wallet = await WalletService.getWallet(user.id);
    qs('#wallet-saldo', container).textContent = formatCurrency(wallet.saldo);
    qs('#wallet-bonus', container).textContent = formatCurrency(wallet.bonus);
    qs('#wallet-insentif', container).textContent = formatCurrency(wallet.insentif);
    qs('#wallet-cod', container).textContent = formatCurrency(wallet.cod);

    const historyEl = qs('#wallet-history', container);
    if (!wallet.mutasi || !wallet.mutasi.length) { show(qs('#wallet-empty', container)); return; }
    historyEl.innerHTML = wallet.mutasi.map((m) =>
      `<div>${m.type.toUpperCase()} ${formatCurrency(m.amount)} — ${formatDateTime(m.at)}${m.note ? ' · ' + escapeHtml(m.note) : ''}</div>`
    ).join('');
  }
  return { init };
})();
Router.register('dompet', DompetController);
