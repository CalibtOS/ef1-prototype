// Fake Stripe checkout sessions. A session is created when the customer
// accepts an offer with a Stripe-supported payment method. The session lives
// in state.entities.checkout_sessions and is rendered by the fake Stripe
// page at #/sim/sim-stripe-checkout?sid=…
import store from '../core/store.js';

function nowIso() { return new Date().toISOString(); }

let counter = 0;
function nextId() {
  counter += 1;
  return `cs_sim_${Date.now().toString(36)}_${counter}`;
}

function createSession({ orderId, customerId, method, amount, installmentN = 1, scenarioId = null }) {
  const session = {
    id: nextId(),
    orderId,
    customerId,
    method,
    amount: Number(amount) || 0,
    installmentN,
    status: 'pending', // pending | succeeded | failed | cancelled
    createdAt: nowIso(),
    scenarioId,
  };
  store.setState(prev => ({
    ...prev,
    entities: {
      ...prev.entities,
      checkout_sessions: store.tableUpsert(prev.entities.checkout_sessions, session),
    },
  }), `sim.stripe.session.create:${session.id}`);
  return session;
}

function getSession(sid) {
  return store.getState().entities.checkout_sessions?.byId?.[sid] || null;
}

function patchSession(sid, patch) {
  store.setState(prev => ({
    ...prev,
    entities: {
      ...prev.entities,
      checkout_sessions: store.tablePatch(prev.entities.checkout_sessions, sid, patch),
    },
  }), `sim.stripe.session.patch:${sid}`);
}

function clearForScenario(scenarioId) {
  if (!scenarioId) return;
  store.setState(prev => {
    const t = prev.entities.checkout_sessions;
    const keepIds = t.allIds.filter(id => t.byId[id]?.scenarioId !== scenarioId);
    const byId = {};
    keepIds.forEach(id => { byId[id] = t.byId[id]; });
    return {
      ...prev,
      entities: { ...prev.entities, checkout_sessions: { byId, allIds: keepIds } },
    };
  }, `sim.stripe.sessions.clearScenario:${scenarioId}`);
}

export { createSession, getSession, patchSession, clearForScenario };
