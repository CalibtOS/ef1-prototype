// Notification fan-out. Every action that wants to ping a role bell goes
// through `notify` here — it owns the entity write + the `efactory:notify`
// DOM event for live listeners.
;(function(){
const I = window.EFInternals;

function notify(payload) {
  const targets = Array.isArray(payload.to) ? payload.to : [payload.to || 'admin'];
  const id = payload.id || ('n-live-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7));
  const note = {
    id,
    to: targets,
    kind: payload.kind || 'event',
    title: payload.title || 'Notification',
    body: payload.body || '',
    urgent: !!payload.urgent,
    read: false,
    at: payload.at || I.nowIso(),
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
      if (targets.includes(role) || targets.includes('all')) byId[id] = { ...n, read: true };
    });
    return { ...table, byId };
  }, 'notifications.markAllRead');
}

window.EFNotifications = { notify, markAllRead };

// Backward-compatible shim for any not-yet-migrated demo hooks.
window.efNotify = notify;
})();
