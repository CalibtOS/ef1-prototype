// Shared plumbing for action modules. No business rules live here — just
// store helpers, selector shortcuts, and the toast bridge.
;(function(){
const store = window.EFStore;
const S = window.EFSelectors;

function nowIso() {
  return new Date().toISOString();
}

function updateTable(kind, updater, label) {
  store.setState(prev => ({
    ...prev,
    entities: { ...prev.entities, [kind]: updater(prev.entities[kind]) },
  }), label);
}

function patchEntity(kind, id, patch, label) {
  updateTable(kind, table => store.tablePatch(table, id, patch), label || `${kind}.patch`);
}

function upsertEntity(kind, item, label) {
  updateTable(kind, table => store.tableUpsert(table, item), label || `${kind}.upsert`);
}

function order(id) {
  return S.selectOrder(store.getState(), id);
}

function gw(id) {
  return S.selectGhostwriter(store.getState(), id);
}

function customer(id) {
  return S.selectCustomer(store.getState(), id);
}

function toast(payload) {
  if (window.efToast) window.efToast(payload);
}

window.EFInternals = {
  nowIso,
  updateTable,
  patchEntity,
  upsertEntity,
  order,
  gw,
  customer,
  toast,
};
})();
