/* ===== Simple Pub/Sub App State ===== */
const State = (() => {
  const data = {
    currentUser: null,
    currentRoute: null,
    deliveries: [],
    notifications: [],
    online: navigator.onLine,
  };
  const listeners = {};

  function get(key) { return data[key]; }
  function set(key, value) {
    data[key] = value;
    (listeners[key] || []).forEach((fn) => fn(value));
  }
  function subscribe(key, fn) {
    (listeners[key] = listeners[key] || []).push(fn);
    return () => { listeners[key] = listeners[key].filter((f) => f !== fn); };
  }
  return { get, set, subscribe };
})();
