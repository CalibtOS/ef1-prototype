// Magic-link / first-login tokens. Stored in state.entities.tokens.
import store from '../core/store.js';

function nowIso() {
  return new Date().toISOString();
}

let counter = 0;
function nextId(kind) {
  counter += 1;
  return `tok-${kind || 'mag'}-${Date.now().toString(36)}-${counter}`;
}

function issue({ customerId, orderId, kind = 'first_login', scenarioId, ttlMinutes = 30 }) {
  const id = nextId(kind);
  const issuedAt = nowIso();
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const token = {
    id,
    customerId,
    orderId: orderId ?? null,
    kind,
    issuedAt,
    expiresAt,
    consumedAt: null,
    scenarioId: scenarioId || null,
  };
  store.setState(prev => ({
    ...prev,
    entities: {
      ...prev.entities,
      tokens: store.tableUpsert(prev.entities.tokens, token),
    },
  }), `sim.token.issue:${kind}`);
  return token;
}

function consume(tokenId) {
  const state = store.getState();
  const token = state.entities.tokens?.byId?.[tokenId];
  if (!token) return { ok: false, reason: 'not_found' };
  if (token.consumedAt) return { ok: false, reason: 'already_consumed', token };
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) return { ok: false, reason: 'expired', token };
  const consumedAt = nowIso();
  store.setState(prev => ({
    ...prev,
    entities: {
      ...prev.entities,
      tokens: store.tablePatch(prev.entities.tokens, tokenId, { consumedAt }),
    },
  }), `sim.token.consume:${tokenId}`);
  return { ok: true, token: { ...token, consumedAt } };
}

function clearForScenario(scenarioId) {
  if (!scenarioId) return;
  store.setState(prev => {
    const t = prev.entities.tokens;
    const keepIds = t.allIds.filter(id => t.byId[id]?.scenarioId !== scenarioId);
    const byId = {};
    keepIds.forEach(id => { byId[id] = t.byId[id]; });
    return {
      ...prev,
      entities: { ...prev.entities, tokens: { byId, allIds: keepIds } },
    };
  }, `sim.tokens.clearScenario:${scenarioId}`);
}

export { issue, consume, clearForScenario };
