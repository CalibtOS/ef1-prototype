// EF — legacy data shape, now importable directly.
//
// Most fields are static data exported from `data.js`. The ones that need to
// reflect live store state (ORDERS, NOTIFICATIONS, KPI, etc.) are defined as
// getters so reads always reflect the current store. Feature files import this
// module directly.
import * as Data from '../../data.js';
import store from './store.js';
import * as S from './selectors.js';
import * as W from './workflow.js';

const EF = {
  GW_DEMO_ASSIGNMENTS: Data.GW_DEMO_ASSIGNMENTS,
  FRIDAY_BATCH: Data.FRIDAY_BATCH,
  INBOX_THREADS: Data.INBOX_THREADS,
  WORK_TYPE_LABELS: Data.WORK_TYPE_LABELS,
  STATUS_PILLS: Data.STATUS_PILLS,
  FEATURE_FLAGS: Data.FEATURE_FLAGS,
  featureStatus: Data.featureStatus,
  isFeatureLive: Data.isFeatureLive,
  GW_ME: Data.GW_ME,
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

export default EF;
