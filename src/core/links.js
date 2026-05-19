// Per-route param vocabularies for deep links. Kept minimal during the
// customer-side migration (see docs/navigation_architecture_review.md).
// Mail CTAs, the notification resolver, and the customer view all share
// these constants so a missing/typo'd tab name fails the same way everywhere.

const CUST_ORDER_TABS = ['status', 'messages', 'files', 'payments'];
const CUST_ORDER_TAB_DEFAULT = 'status';

function normalizeCustOrderTab(tab) {
  return CUST_ORDER_TABS.includes(tab) ? tab : CUST_ORDER_TAB_DEFAULT;
}

export { CUST_ORDER_TABS, CUST_ORDER_TAB_DEFAULT, normalizeCustOrderTab };
