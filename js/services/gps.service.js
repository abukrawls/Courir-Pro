/* =====================================================================
   GPS Service — live location, tracking, hitung jarak & estimasi waktu.
===================================================================== */
const GpsService = (() => {
  let watchId = null;

  function getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Geolocation tidak didukung.'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  function watchPosition(onUpdate) {
    if (!navigator.geolocation) return;
    watchId = navigator.geolocation.watchPosition(
      (pos) => onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('GPS watch error:', err.message),
      { enableHighAccuracy: true }
    );
  }

  function stopWatch() { if (watchId !== null) navigator.geolocation.clearWatch(watchId); watchId = null; }

  function haversineDistanceKm(a, b) {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function estimateEtaMinutes(distanceKm, avgSpeedKmh = 30) {
    return Math.round((distanceKm / avgSpeedKmh) * 60);
  }

  function openNavigation(lat, lng) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  }

  return { getCurrentPosition, watchPosition, stopWatch, haversineDistanceKm, estimateEtaMinutes, openNavigation };
})();
