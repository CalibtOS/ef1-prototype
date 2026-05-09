// Entity hydration and normalization.
;(function(){
function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalize(list) {
  const byId = {};
  const allIds = [];
  (list || []).forEach(item => {
    if (!item || item.id == null || byId[item.id]) return;
    byId[item.id] = clone(item);
    allIds.push(item.id);
  });
  return { byId, allIds };
}

function customerDemoOrder() {
  return {
    id: 3518,
    status: 'under_customer_review',
    customerId: 'c-ab',
    workType: 'bachelorarbeit',
    title: 'Strategisches Controlling im Maschinenbau',
    field: 'BWL',
    pages: 40,
    finalDeadline: '2026-05-22T18:00:00',
    interimDeadline: '2026-05-08T18:00:00',
    interim2Deadline: '2026-05-15T18:00:00',
    grossEur: 2360,
    netHonorarium: 793.46,
    rate: 0.36,
    gwId: 'gw-mp',
    acceptedAt: '2026-04-01',
    leadSource: 'ig',
    paidEur: 1180,
    outstandingEur: 1180,
    installments: [
      { n: 1, amt: 1180, status: 'paid', date: '2026-04-01', method: 'stripe_card' },
      { n: 2, amt: 1180, status: 'scheduled', date: '2026-05-15', method: 'stripe_card' },
    ],
    revisionRounds: 0,
    gwPaymentStatus: 'work_in_progress',
    customerNote: 'Fokus auf Industrie-4.0-Kennzahlen; Fallbeispiel Bosch.',
  };
}

function roleSeedNotifications(D) {
  const admin = (D.NOTIFICATIONS || []).map(n => ({ ...n, to: n.to || 'admin' }));
  return [
    ...admin,
    { id: 'qn1', to: 'qa', kind: 'final_uploaded', title: 'New submission · #3530', body: 'Felix Becker · final work · pending', at: '2026-05-07T09:14:00', urgent: false, read: false },
    { id: 'qn2', to: 'qa', kind: 'ai_violation', title: 'AI flag · #3517', body: 'Score 87% — verdict required', at: '2026-05-07T08:42:00', urgent: true, read: false },
    { id: 'gn1', to: 'gw', kind: 'assignment_approved', title: 'Claim approved · #3526', body: 'Briefing email sent', at: '2026-05-07T11:14:00', read: false },
    { id: 'gn2', to: 'gw', kind: 'interim_due_d1', title: 'Interim deadline tomorrow', body: '#3508 · Zwischenstand 1 · 18:00', at: '2026-05-07T09:00:00', read: false },
    { id: 'cn1', to: 'customer', kind: 'interim_received', title: 'Zwischenstand verfügbar', body: 'Auftrag #3518 — Zwischenstand 1 hochgeladen · bitte prüfen', at: '2026-05-06T15:30:00', read: false, urgent: false },
    { id: 'cn2', to: 'customer', kind: 'payment_confirmed', title: 'Zahlung bestätigt', body: 'Rate 1 von 2 · 1.180,00 € · Kreditkarte · Auftrag #3518', at: '2026-04-01T10:00:00', read: true },
  ];
}

function hydrate() {
  const D = window.EF || {};
  const baseOrders = [
    ...(D.ORDERS || []),
    ...(D.GW_DEMO_ASSIGNMENTS || []),
  ];
  if (!baseOrders.some(o => Number(o.id) === 3518)) baseOrders.push(customerDemoOrder());

  return {
    orders: normalize(baseOrders),
    submissions: normalize(D.SUBMISSIONS || []),
    customers: normalize(D.CUSTOMERS || []),
    ghostwriters: normalize(D.GHOSTWRITERS || []),
    threads: normalize(D.INBOX_THREADS || []),
    notifications: normalize(roleSeedNotifications(D)),
  };
}

window.EFEntities = { hydrate, normalize, clone };
})();
