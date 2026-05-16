// Simulated external-system artifacts. The Sevdesk Angebot / Rechnung PDFs
// are stubs (no real file rendering yet) — we store metadata that the order
// detail and Demo Inbox can link to.
import store from '../core/store.js';

function nowIso() { return new Date().toISOString(); }

let counter = 0;
function nextId(kind) {
  counter += 1;
  return `art-${kind || 'a'}-${Date.now().toString(36)}-${counter}`;
}

function create({ kind, orderId, customerId, fileName, label, externalRef, scenarioId = null }) {
  const artifact = {
    id: nextId(kind),
    kind,
    orderId,
    customerId,
    fileName,
    label: label || fileName,
    externalRef: externalRef || null,
    createdAt: nowIso(),
    scenarioId,
  };
  store.setState(prev => ({
    ...prev,
    entities: {
      ...prev.entities,
      offer_artifacts: store.tableUpsert(prev.entities.offer_artifacts, artifact),
    },
  }), `sim.artifact.create:${kind}`);
  return artifact;
}

function clearForScenario(scenarioId) {
  if (!scenarioId) return;
  store.setState(prev => {
    const t = prev.entities.offer_artifacts;
    const keepIds = t.allIds.filter(id => t.byId[id]?.scenarioId !== scenarioId);
    const byId = {};
    keepIds.forEach(id => { byId[id] = t.byId[id]; });
    return {
      ...prev,
      entities: { ...prev.entities, offer_artifacts: { byId, allIds: keepIds } },
    };
  }, `sim.artifacts.clearScenario:${scenarioId}`);
}

export { create, clearForScenario };
