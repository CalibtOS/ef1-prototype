// Tiny domain-event bus. Core actions emit canonical events here; simulation
// effects subscribe in src/sim/effects.js. Keeps actions free of demo
// concerns (no email/PDF/Pipedrive imports inside core/actions.js).
//
// Not a backend contract — names are likely to change after team review.

const listeners = new Map();

function on(kind, fn) {
  if (!listeners.has(kind)) listeners.set(kind, new Set());
  listeners.get(kind).add(fn);
  return () => listeners.get(kind)?.delete(fn);
}

function emit(kind, payload) {
  const set = listeners.get(kind);
  if (!set) return;
  set.forEach(fn => {
    try { fn(payload); } catch (e) { setTimeout(() => { throw e; }); }
  });
}

export { on, emit };
