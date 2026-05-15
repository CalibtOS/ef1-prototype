// Tiny observable store.
import { hydrate } from './entities.js';

const entities = hydrate();

const initialState = {
  entities,
  session: {
    role: 'admin',
    gwId: 'gw-iw',
    customerId: 'c-ab',
  },
  ui: {
    route: { name: 'admin-dashboard', params: {} },
    tweaks: null,
  },
  meta: { version: 0 },
};

let state = initialState;
const listeners = new Set();

function getState() {
  return state;
}

function setState(update, label) {
  const next = typeof update === 'function' ? update(state) : { ...state, ...update };
  if (!next || next === state) return state;
  state = {
    ...next,
    meta: {
      ...(next.meta || {}),
      version: ((state.meta && state.meta.version) || 0) + 1,
      lastAction: label || (next.meta && next.meta.lastAction) || null,
    },
  };
  listeners.forEach(fn => {
    try { fn(state); } catch (e) { setTimeout(() => { throw e; }); }
  });
  return state;
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function tableUpsert(table, item) {
  const id = item.id;
  const exists = Object.prototype.hasOwnProperty.call(table.byId, id);
  return {
    byId: { ...table.byId, [id]: item },
    allIds: exists ? table.allIds : [...table.allIds, id],
  };
}

function tablePatch(table, id, patch) {
  const prev = table.byId[id];
  const base = prev || { id };
  const next = typeof patch === 'function' ? patch(base) : { ...base, ...patch };
  return tableUpsert(table, next);
}

function replaceEntityTable(kind, table) {
  return setState(prev => ({
    ...prev,
    entities: { ...prev.entities, [kind]: table },
  }), `replace:${kind}`);
}

const store = { getState, setState, subscribe, tableUpsert, tablePatch, replaceEntityTable };
export default store;
export { getState, setState, subscribe, tableUpsert, tablePatch, replaceEntityTable };
