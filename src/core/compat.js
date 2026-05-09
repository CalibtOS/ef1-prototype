// Compatibility bridge: keeps the existing EF global API backed by the new store.
;(function(){
const EF = window.EF || {};
const store = window.EFStore;
const S = window.EFSelectors;
const W = window.EFWorkflow;

function defineGetter(name, get) {
  try {
    Object.defineProperty(EF, name, { configurable: true, enumerable: true, get });
  } catch (e) {
    EF[name] = get();
  }
}

defineGetter('ORDERS', () => S.selectAllOrders(store.getState()));
defineGetter('SUBMISSIONS', () => S.selectAllSubmissions(store.getState()));
defineGetter('CUSTOMERS', () => S.selectAllCustomers(store.getState()));
defineGetter('GHOSTWRITERS', () => S.selectAllGhostwriters(store.getState()));
defineGetter('INBOX_THREADS', () => S.selectThreads(store.getState()));
defineGetter('NOTIFICATIONS', () => S.selectNotifications(store.getState(), store.getState().session.role));
defineGetter('KPI', () => S.selectKpis(store.getState()));

EF.liveOrders = () => S.selectAllOrders(store.getState());
EF.liveOrder = (id) => S.selectOrder(store.getState(), id);
EF.releaseGates = W.releaseGates;
EF.myAssignments = () => S.selectOrdersByGw(store.getState(), store.getState().session.gwId);
EF.gw = (id) => S.selectGhostwriter(store.getState(), id);
EF.customer = (id) => S.selectCustomer(store.getState(), id);
EF.order = (id) => S.selectOrder(store.getState(), id);

window.EF = EF;
})();
