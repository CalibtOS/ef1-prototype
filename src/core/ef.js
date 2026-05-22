// EF — bundle accessor that mirrors the original `window.EF` API as a regular
// import. Static fields are pass-throughs from `data.js`. Reactive fields
// (ORDERS, NOTIFICATIONS, KPI, …) are getters so each read pulls from the
// current store.
//
// Prefer importing the underlying modules directly in new code:
//   - static data → `data.js`
//   - reactive reads → `core/selectors.js` (or the matching `core/hooks.js`)
//   - workflow helpers → `core/workflow.js`
// This object exists so feature files migrated from `window.EF` keep working
// while we incrementally swap them over.
import * as Data from '../../data.js';
import store from './store.js';
import * as S from './selectors.js';
import * as W from './workflow.js';

const EF = {
  GW_DEMO_ASSIGNMENTS: Data.GW_DEMO_ASSIGNMENTS,
  FRIDAY_BATCH: Data.FRIDAY_BATCH,
  WORK_TYPE_LABELS: Data.WORK_TYPE_LABELS,
  STATUS_PILLS: Data.STATUS_PILLS,
  FEATURE_FLAGS: Data.FEATURE_FLAGS,
  featureStatus: Data.featureStatus,
  isFeatureLive: Data.isFeatureLive,
  liveOrders: () => S.selectAllOrders(store.getState()),
  liveOrder: (id) => S.selectOrder(store.getState(), id),
  releaseGates: W.releaseGates,
  myAssignments: () => S.selectOrdersByGw(store.getState(), store.getState().session.gwId),
  gw: (id) => S.selectGhostwriter(store.getState(), id),
  customer: (id) => S.selectCustomer(store.getState(), id),
  order: (id) => S.selectOrder(store.getState(), id),
};

function defineGetter(name, get) {
  Object.defineProperty(EF, name, { configurable: true, enumerable: true, get });
}
defineGetter('NOW', () => Data.liveNow());
defineGetter('DEMO_NOW', () => Data.liveNow());
defineGetter('ORDERS', () => S.selectAllOrders(store.getState()));
defineGetter('SUBMISSIONS', () => S.selectAllSubmissions(store.getState()));
defineGetter('CUSTOMERS', () => S.selectAllCustomers(store.getState()));
defineGetter('GHOSTWRITERS', () => S.selectAllGhostwriters(store.getState()));
defineGetter('NOTIFICATIONS', () => S.selectNotifications(store.getState(), store.getState().session.role));
defineGetter('KPI', () => S.selectKpis(store.getState()));
// GW_ME: live wrapper over selectGhostwriter(state, session.gwId). Falls back
// to a minimal stub if the session hasn't been hydrated yet (boot edge case).
defineGetter('GW_ME', () => {
  const state = store.getState();
  const gwId = state.session?.gwId;
  const gw = gwId ? S.selectGhostwriter(state, gwId) : null;
  return gw || { id: gwId, name: '—', initials: '—', email: '', onTime: 0, rating: 0, lifetime: 0 };
});

export default EF;
