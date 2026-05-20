// Notification fan-out. Every action that wants to ping a role bell goes
// through `notify` here — it owns the entity write + the `efactory:notify`
// DOM event for live listeners.
import * as I from './internals.js';
import store from './store.js';

// Extract an order id from any notification-shaped payload — prefer the
// explicit `orderId` field, fall back to scanning `title`/`body` for `#NNNN`.
// The regex fallback only sees the FIRST match — aggregate messages like
// "released #3502 and #3508" route to whichever number appears first. Callers
// should always set `orderId` explicitly; the fallback exists for legacy
// fixtures and emits a dev warning when it fires.
function inferOrderId(payload) {
  if (!payload) return null;
  if (payload.orderId != null) return Number(payload.orderId);
  const text = [payload.title, payload.body].filter(Boolean).join(' ');
  const match = text.match(/(?:#|order\s*#?|auftrag\s*#?)(\d{3,})/i);
  if (match) {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
      const allMatches = text.match(/(?:#|order\s*#?|auftrag\s*#?)(\d{3,})/gi) || [];
      if (allMatches.length > 1) {
        console.warn(`[inferOrderId] notification mentions ${allMatches.length} orders but no explicit orderId set; routing to first match #${match[1]}. Payload kind=${payload.kind}`);
      } else if (payload.kind) {
        console.warn(`[inferOrderId] no orderId on payload (kind=${payload.kind}); inferred #${match[1]} from text. Pass orderId explicitly.`);
      }
    }
    return Number(match[1]);
  }
  return null;
}

function matchesSessionAudience(note, role) {
  const state = store.getState?.();
  if (!state || !role) return true;
  if (role === 'gw' && note.gwId && note.gwId !== state.session.gwId) return false;
  if (role === 'customer' && note.customerId && note.customerId !== state.session.customerId) return false;
  return true;
}

function notify(payload) {
  const targets = Array.isArray(payload.to) ? payload.to : [payload.to || 'admin'];
  const id = payload.id || ('n-live-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
  const orderId = inferOrderId(payload);
  const relatedOrder = orderId != null ? I.order(orderId) : null;
  const note = {
    id,
    to: targets,
    kind: payload.kind || 'event',
    title: payload.title || 'Notification',
    body: payload.body || '',
    urgent: !!payload.urgent,
    read: false,
    at: payload.at || I.nowIso(),
    orderId,
    customerId: payload.customerId || relatedOrder?.customerId || null,
    gwId: payload.gwId || relatedOrder?.gwId || null,
    submissionId: payload.submissionId || null,
    threadId: payload.threadId || null,
    route: payload.route || null,
    params: payload.params || null,
  };
  I.upsertEntity('notifications', note, 'notifications.add');
  try { window.dispatchEvent(new CustomEvent('efactory:notify', { detail: note })); } catch(e) {}
  return note;
}

function markAllRead(role) {
  I.updateTable('notifications', table => {
    const byId = { ...table.byId };
    table.allIds.forEach(id => {
      const n = byId[id];
      const targets = Array.isArray(n.to) ? n.to : [n.to || 'admin'];
      if ((targets.includes(role) || targets.includes('all')) && matchesSessionAudience(n, role)) byId[id] = { ...n, read: true };
    });
    return { ...table, byId };
  }, 'notifications.markAllRead');
}

function markRead(id, role) {
  if (!id) return;
  I.updateTable('notifications', table => {
    const note = table.byId[id];
    if (!note) return table;
    const targets = Array.isArray(note.to) ? note.to : [note.to || 'admin'];
    if (role && !targets.includes(role) && !targets.includes('all')) return table;
    if (!matchesSessionAudience(note, role)) return table;
    return {
      ...table,
      byId: { ...table.byId, [id]: { ...note, read: true } },
    };
  }, 'notifications.markRead');
}

export { notify, markAllRead, markRead, inferOrderId };
