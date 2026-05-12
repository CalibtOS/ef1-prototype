// Derived reads. Components should prefer hooks that wrap these selectors.
;(function(){
const W = window.EFWorkflow;

function tableItems(table) {
  return (table?.allIds || []).map(id => table.byId[id]).filter(Boolean);
}

function byId(table, id) {
  if (id == null) return null;
  const numericId = typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;
  return table?.byId?.[numericId] || table?.byId?.[id] || null;
}

function selectAllOrders(state) {
  return tableItems(state.entities.orders);
}

function selectOrder(state, id) {
  return byId(state.entities.orders, id);
}

function selectAllSubmissions(state) {
  return tableItems(state.entities.submissions).sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
}

function selectSubmissionsForOrder(state, orderId) {
  return selectAllSubmissions(state).filter(s => Number(s.orderId) === Number(orderId));
}

function selectQaQueue(state) {
  return selectAllSubmissions(state).filter(s =>
    W.isQaReviewKind(s.kind) && (s.qaStatus === 'pending' || s.aiScore > 50 || s.flagged)
  );
}

function selectAllCustomers(state) {
  return tableItems(state.entities.customers);
}

function selectCustomer(state, id) {
  return byId(state.entities.customers, id);
}

function selectAllGhostwriters(state) {
  return tableItems(state.entities.ghostwriters);
}

function selectGhostwriter(state, id) {
  return byId(state.entities.ghostwriters, id);
}

function selectOrdersByGw(state, gwId) {
  return selectAllOrders(state).filter(o => o.gwId === gwId);
}

function selectOrdersByCustomer(state, customerId) {
  return selectAllOrders(state).filter(o => o.customerId === customerId);
}

function selectThreads(state) {
  return tableItems(state.entities.threads).sort((a, b) => new Date(b.lastAt || 0) - new Date(a.lastAt || 0));
}

function selectThread(state, id) {
  return byId(state.entities.threads, id);
}

function selectThreadByOrder(state, orderId) {
  if (orderId == null) return null;
  return tableItems(state.entities.threads).find(t => Number(t.orderId) === Number(orderId)) || null;
}

function selectNotifications(state, role) {
  const target = role || state.session.role || 'admin';
  return tableItems(state.entities.notifications)
    .filter(n => {
      const to = Array.isArray(n.to) ? n.to : [n.to || 'admin'];
      return to.includes(target) || to.includes('all');
    })
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
}

function selectKpis(state) {
  const orders = selectAllOrders(state);
  const submissions = selectAllSubmissions(state);
  const friday = orders.filter(o => W.releaseGates(o).releasable);
  const fridayEur = friday.reduce((s, o) => s + (o.netHonorarium || 0), 0);
  const now = window.EF?.DEMO_NOW || new Date();
  return {
    openReceivables: orders.reduce((s, o) => s + (W.canShowReceivable(o) ? (o.outstandingEur || 0) : 0), 0),
    activeOrders: 645,
    completedLifetime: 3359,
    totalLifetime: 3522,
    fridayCount: friday.length,
    fridayEur: Math.round(fridayEur * 100) / 100,
    qaPending: submissions.filter(s => W.isQaReviewKind(s.kind) && s.qaStatus === 'pending').length,
    overdueInterim: orders.filter(o => {
      if (!o.interimDeadline) return false;
      if (['completed','cancelled','payment_pending'].includes(o.status)) return false;
      return new Date(o.interimDeadline) < now;
    }).length,
    aiFlagged: submissions.filter(s => s.aiScore >= 70 || s.flagged).length,
    disputesOpen: orders.filter(o => o.disputeOpen).length,
    pipedriveSubs: '4,159 / 5,000',
  };
}

function selectFridayBatch(state) {
  const considered = selectAllOrders(state).filter(o =>
    o.status === 'payment_pending' ||
    o.status === 'ai_violation_review' ||
    o.status === 'plagiarism_violation_review'
  );
  const rows = considered.map(o => ({ order: o, gates: W.releaseGates(o) }));
  return {
    releaseable: rows.filter(r => r.gates.releasable).map(r => r.order),
    blocked: rows.filter(r => !r.gates.releasable).map(r => ({ order: r.order, gates: r.gates })),
  };
}

window.EFSelectors = {
  tableItems,
  byId,
  selectAllOrders,
  selectOrder,
  selectAllSubmissions,
  selectSubmissionsForOrder,
  selectQaQueue,
  selectAllCustomers,
  selectCustomer,
  selectAllGhostwriters,
  selectGhostwriter,
  selectOrdersByGw,
  selectOrdersByCustomer,
  selectThreads,
  selectThread,
  selectThreadByOrder,
  selectNotifications,
  selectKpis,
  selectFridayBatch,
};
})();
