// Sim event emitter. Sim events are demo evidence rows, not domain state.
// They are appended into `state.entities.sim_events` and rendered in the
// Sim Console drawer (demo harness only).
import store from '../core/store.js';

function nowIso() {
  return new Date().toISOString();
}

let counter = 0;
function nextId() {
  counter += 1;
  return `evt-${Date.now().toString(36)}-${counter}`;
}

function emit(event) {
  const row = {
    id: nextId(),
    at: event.at || nowIso(),
    source: event.source || 'platform',
    kind: event.kind || 'event',
    orderId: event.orderId ?? null,
    customerId: event.customerId ?? null,
    detail: event.detail || null,
    scenarioId: event.scenarioId || null,
  };
  store.setState(prev => ({
    ...prev,
    entities: {
      ...prev.entities,
      sim_events: store.tableUpsert(prev.entities.sim_events, row),
    },
  }), `sim.event.${row.kind}`);
  return row;
}

function listByScenario(state, scenarioId) {
  const all = (state.entities.sim_events?.allIds || []).map(id => state.entities.sim_events.byId[id]);
  if (!scenarioId) return all;
  return all.filter(e => e.scenarioId === scenarioId);
}

function clearForScenario(scenarioId) {
  if (!scenarioId) return;
  store.setState(prev => {
    const t = prev.entities.sim_events;
    const keepIds = t.allIds.filter(id => t.byId[id]?.scenarioId !== scenarioId);
    const byId = {};
    keepIds.forEach(id => { byId[id] = t.byId[id]; });
    return {
      ...prev,
      entities: { ...prev.entities, sim_events: { byId, allIds: keepIds } },
    };
  }, `sim.events.clearScenario:${scenarioId}`);
}

export { emit, listByScenario, clearForScenario };
