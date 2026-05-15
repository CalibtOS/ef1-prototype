// Tiny toast service. Decouples non-component code (action handlers, the
// `NotReady` button, ad-hoc helpers) from the React-owned toast queue.
//
// The App in main.jsx calls `setEmitter(fn)` once during mount; everyone else
// imports `showToast` and forgets it exists. Calls before the emitter is
// registered are silently dropped — matches the previous `if (window.efToast)`
// guard.

let emitter = null;

function setEmitter(fn) {
  emitter = typeof fn === 'function' ? fn : null;
}

function showToast(payload) {
  if (emitter) emitter(payload);
}

export { setEmitter, showToast };
