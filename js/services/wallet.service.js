/* ===== Wallet Service — Saldo, Bonus, Insentif, COD, Mutasi ===== */
const WalletService = (() => {
  async function getWallet(userId) {
    const all = await DB.getAll(STORES.WALLET);
    const existing = all.find((w) => w.userId === userId);
    return existing || { id: crypto.randomUUID(), userId, saldo: 0, bonus: 0, insentif: 0, cod: 0, mutasi: [] };
  }

  async function addMutasi(userId, entry) {
    const wallet = await getWallet(userId);
    wallet.mutasi = wallet.mutasi || [];
    wallet.mutasi.unshift({ ...entry, at: new Date().toISOString() });
    if (entry.type === 'saldo') wallet.saldo += entry.amount;
    if (entry.type === 'bonus') wallet.bonus += entry.amount;
    if (entry.type === 'insentif') wallet.insentif += entry.amount;
    if (entry.type === 'cod') wallet.cod += entry.amount;
    wallet.synced = false;
    await DB.put(STORES.WALLET, wallet);
    await DB.queueSync({ store: 'wallet', type: 'update', payload: wallet });
    return wallet;
  }

  return { getWallet, addMutasi };
})();
