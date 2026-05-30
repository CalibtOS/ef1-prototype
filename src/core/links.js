// Single source of truth for deep-link shapes. Mail CTAs, the notification
// resolver, and the customer view all run through `buildLink({ kind, ... })`
// so an unknown kind or a typo'd tab name fails the same way everywhere —
// instead of fragmenting across `cta.action` strings, notification target
// shapes, and hand-built `{role, name, params}` tuples.
//
// See docs/navigation_architecture_review.md §3.2 for the contract.

// Per-route tab vocabularies. Pass a tab not in this list and dev mode warns
// (the link still resolves, falling back to the route default). Production
// strips the tab silently so a typo doesn't break the link.
const ROUTE_TABS = {
  'cust-orders':    { tabs: ['status', 'messages', 'files', 'payments'], default: 'status' },
  'order-detail':   { tabs: ['overview', 'payments', 'submissions', 'communications', 'assignment', 'audit'], default: 'overview' },
};

function normalizeTab(routeName, tab) {
  const spec = ROUTE_TABS[routeName];
  if (!spec) return tab || null;
  if (!tab) return null;
  if (spec.tabs.includes(tab)) return tab;
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[buildLink] unknown tab "${tab}" for route ${routeName}; valid: [${spec.tabs.join(', ')}]`);
  }
  return null;
}

// buildLink({ kind, ...payload }) → { role, name, params } or null.
// `null` means "no link" (e.g. unknown kind); callers should no-op rather than
// hand-build a fallback. Returning a uniform shape lets the consumer call
// `switchRole(link.role, link.name, link.params)` or
// `navigate(link.name, link.params)` without sniffing.
function buildLink(target) {
  if (!target || !target.kind) return null;
  const k = target.kind;

  if (k === 'customer-order') {
    const params = {};
    if (target.orderId != null) params.orderId = Number(target.orderId);
    const tab = normalizeTab('cust-orders', target.tab);
    if (tab) params.tab = tab;
    return { role: 'customer', name: 'cust-orders', params };
  }

  if (k === 'customer-section') {
    const section = target.section || 'orders';
    const route = section === 'orders' ? 'cust-orders'
      : section === 'messages' ? 'cust-messages'
      : section === 'invoices' ? 'cust-invoices'
      : section === 'downloads' ? 'cust-downloads'
      : section === 'profile' ? 'cust-profile'
      : section === 'reports' ? 'cust-reports'
      : 'cust-orders';
    return { role: 'customer', name: route, params: {} };
  }

  if (k === 'admin-order') {
    const params = {};
    if (target.orderId != null) params.id = Number(target.orderId);
    const tab = normalizeTab('order-detail', target.tab);
    if (tab) params.tab = tab;
    if (target.submissionId != null) params.submissionId = target.submissionId;
    if (target.reportId != null) params.reportId = target.reportId;
    return { role: 'admin', name: 'order-detail', params };
  }

  if (k === 'admin-friday-batch') {
    return { role: 'admin', name: 'friday-batch', params: {} };
  }

  if (k === 'admin-inbox') {
    const params = {};
    if (target.contact) params.contact = target.contact;
    return { role: 'admin', name: 'inbox', params };
  }

  if (k === 'gw-assignment') {
    const params = { id: Number(target.orderId) };
    if (target.kind2) params.kind = target.kind2;
    return { role: 'gw', name: 'gw-assignment-detail', params };
  }

  if (k === 'gw-job-board') {
    return { role: 'gw', name: 'gw-job-board', params: target.orderId != null ? { orderId: Number(target.orderId) } : {} };
  }

  if (k === 'gw-payments') {
    return { role: 'gw', name: 'gw-payments', params: target.orderId != null ? { orderId: Number(target.orderId) } : {} };
  }

  if (k === 'gw-reports') {
    return { role: 'gw', name: 'gw-reports', params: {} };
  }

  if (k === 'gw-submit') {
    return { role: 'gw', name: 'gw-submit', params: { id: Number(target.orderId), ...(target.submitKind ? { kind: target.submitKind } : {}) } };
  }

  if (k === 'stripe-checkout') {
    return { role: 'sim', name: 'sim-stripe-checkout', params: target.sid ? { sid: target.sid } : {} };
  }

  // Tokens are resolved by the inbox handler, not by buildLink — they need to
  // hit Scenarios.consumeFirstLoginAndAttach before navigating. Returning null
  // here makes the inbox handler take the token branch.
  if (k === 'consume-token') return null;

  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[buildLink] unknown kind "${k}"; returning null`);
  }
  return null;
}

// Translate the legacy mail-CTA `action` string into a target object, for
// backwards compatibility while we migrate mail builders to cta.target.
function targetFromLegacyCta(cta) {
  if (!cta) return null;
  if (cta.target) return cta.target;
  switch (cta.action) {
    case 'consume_token':
      return { kind: 'consume-token', tokenId: cta.tokenId };
    case 'open_customer_dashboard':
      return { kind: 'customer-order', orderId: cta.orderId, tab: cta.tab, customerId: cta.customerId };
    case 'open_customer_order':
      return { kind: 'customer-order', orderId: cta.orderId, tab: cta.tab, customerId: cta.customerId };
    case 'open_admin_order':
      return { kind: 'admin-order', orderId: cta.orderId, tab: cta.tab, submissionId: cta.submissionId };
    case 'open_admin_dispute':
      return { kind: 'admin-order', orderId: cta.orderId };
    case 'open_gw_job_board':
      return { kind: 'gw-job-board', orderId: cta.orderId };
    case 'open_gw_assignment':
      return { kind: 'gw-assignment', orderId: cta.orderId };
    case 'open_gw_payments':
      return { kind: 'gw-payments', orderId: cta.orderId };
    case 'open_admin_friday_batch':
      return { kind: 'admin-friday-batch' };
    case 'open_stripe_checkout':
      return { kind: 'stripe-checkout', sid: cta.sid };
    default:
      return null;
  }
}

// Legacy export retained — the customer view migration uses this.
const CUST_ORDER_TABS = ROUTE_TABS['cust-orders'].tabs;
const CUST_ORDER_TAB_DEFAULT = ROUTE_TABS['cust-orders'].default;
function normalizeCustOrderTab(tab) {
  return CUST_ORDER_TABS.includes(tab) ? tab : CUST_ORDER_TAB_DEFAULT;
}

export {
  buildLink,
  targetFromLegacyCta,
  ROUTE_TABS,
  normalizeTab,
  CUST_ORDER_TABS,
  CUST_ORDER_TAB_DEFAULT,
  normalizeCustOrderTab,
};
