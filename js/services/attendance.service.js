/* ===== Attendance Service — Check In/Out + GPS + Selfie ===== */
const AttendanceService = (() => {
  async function getToday(userId) {
    const all = await DB.getAll(STORES.ATTENDANCE);
    const todayStr = new Date().toISOString().slice(0, 10);
    return all.find((a) => a.userId === userId && a.date === todayStr);
  }

  async function checkIn(userId, { photo, gps }) {
    const record = {
      id: crypto.randomUUID(), userId, date: new Date().toISOString().slice(0, 10),
      checkIn: new Date().toISOString(), checkOut: null, photoIn: photo, gpsIn: gps, synced: false,
    };
    await DB.put(STORES.ATTENDANCE, record);
    await DB.queueSync({ store: 'attendance', type: 'insert', payload: record });
    return record;
  }

  async function checkOut(recordId, { photo, gps }) {
    const record = await DB.get(STORES.ATTENDANCE, recordId);
    const updated = { ...record, checkOut: new Date().toISOString(), photoOut: photo, gpsOut: gps, synced: false };
    await DB.put(STORES.ATTENDANCE, updated);
    await DB.queueSync({ store: 'attendance', type: 'update', payload: updated });
    return updated;
  }

  async function getHistory(userId) {
    const all = await DB.getAll(STORES.ATTENDANCE);
    return all.filter((a) => a.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  return { getToday, checkIn, checkOut, getHistory };
})();
