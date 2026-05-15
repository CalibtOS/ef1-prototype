// React hooks over the store/selectors.
import React from 'react';
import store from './store.js';
import * as S from './selectors.js';
import * as W from './workflow.js';
import A from './actions.js';

function shallowEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every(k => Object.is(a[k], b[k]));
}

function useStore(selector, equal = Object.is) {
  const select = selector || ((s) => s);
  const [slice, setSlice] = React.useState(() => select(store.getState()));
  React.useEffect(() => {
    let current = select(store.getState());
    setSlice(prev => equal(prev, current) ? prev : current);
    return store.subscribe((state) => {
      const next = select(state);
      setSlice(prev => equal(prev, next) ? prev : next);
      current = next;
    });
  }, [selector, equal]);
  return slice;
}

function useOrders(opts = {}) {
  const key = JSON.stringify(opts || {});
  const selector = React.useMemo(() => (state) => {
    let orders = S.selectAllOrders(state);
    if (opts.gwId) orders = orders.filter(o => o.gwId === opts.gwId);
    if (opts.customerId) orders = orders.filter(o => o.customerId === opts.customerId);
    if (opts.status) {
      const statuses = Array.isArray(opts.status) ? opts.status : [opts.status];
      orders = orders.filter(o => statuses.includes(o.status));
    }
    if (opts.filter === 'available') orders = orders.filter(o => o.status === 'available' && !o.gwId);
    if (opts.filter === 'active') orders = orders.filter(o => !['completed','cancelled'].includes(o.status));
    return orders;
  }, [key]);
  return useStore(selector, shallowEqual);
}

function useOrder(id) {
  const selector = React.useMemo(() => (state) => S.selectOrder(state, id), [id]);
  return useStore(selector, shallowEqual);
}

function useSubmissions(opts = {}) {
  const key = JSON.stringify(opts || {});
  const selector = React.useMemo(() => (state) => {
    if (opts.orderId != null) return S.selectSubmissionsForOrder(state, opts.orderId);
    if (opts.qaQueue) return S.selectQaQueue(state);
    return S.selectAllSubmissions(state);
  }, [key]);
  return useStore(selector, shallowEqual);
}

function useDisplaySubmissions(orderId) {
  const selector = React.useMemo(() => (state) => S.selectDisplaySubmissionsForOrder(state, orderId), [orderId]);
  return useStore(selector, shallowEqual);
}

function useOrderEvents(orderId) {
  const selector = React.useMemo(() => (state) => S.selectOrderEvents(state, orderId), [orderId]);
  return useStore(selector, shallowEqual);
}

function useQaHistory() {
  return useStore(S.selectQaHistory, shallowEqual);
}

function useKpis() {
  return useStore(S.selectKpis, shallowEqual);
}

function useReleaseGate(id) {
  const selector = React.useMemo(() => (state) => W.releaseGates(S.selectOrder(state, id)), [id]);
  return useStore(selector, shallowEqual);
}

function useGw(id) {
  const selector = React.useMemo(() => (state) => S.selectGhostwriter(state, id), [id]);
  return useStore(selector, shallowEqual);
}

function useCustomer(id) {
  const selector = React.useMemo(() => (state) => S.selectCustomer(state, id), [id]);
  return useStore(selector, shallowEqual);
}

function useGhostwriters() {
  return useStore(S.selectAllGhostwriters, shallowEqual);
}

function useCustomers() {
  return useStore(S.selectAllCustomers, shallowEqual);
}

function useThreads() {
  return useStore(S.selectThreads, shallowEqual);
}

function useThread(id) {
  const selector = React.useMemo(() => (state) => S.selectThread(state, id), [id]);
  return useStore(selector, shallowEqual);
}

function useThreadByOrder(orderId) {
  const selector = React.useMemo(() => (state) => S.selectThreadByOrder(state, orderId), [orderId]);
  return useStore(selector, shallowEqual);
}

function useNotifications(role) {
  const selector = React.useMemo(() => (state) => S.selectNotifications(state, role || state.session.role), [role]);
  return useStore(selector, shallowEqual);
}

function useCurrentRole() {
  return useStore(state => state.session, shallowEqual);
}

function useNavigation() {
  return useStore(state => state.ui.route, shallowEqual);
}

function useToast() {
  return { toast: A.toast };
}

function useFridayBatch() {
  return useStore(S.selectFridayBatch, shallowEqual);
}

function useRevenueAtRisk() {
  return useStore(S.selectRevenueAtRisk, shallowEqual);
}

function useNeedsDecision() {
  return useStore(S.selectNeedsDecision, shallowEqual);
}

function useSlaOperational() {
  return useStore(S.selectSlaOperational, shallowEqual);
}

function useCashFriday() {
  return useStore(S.selectCashFriday, shallowEqual);
}

export {
  useStore,
  useOrders,
  useOrder,
  useSubmissions,
  useDisplaySubmissions,
  useOrderEvents,
  useQaHistory,
  useKpis,
  useReleaseGate,
  useGw,
  useCustomer,
  useGhostwriters,
  useCustomers,
  useThreads,
  useThread,
  useThreadByOrder,
  useNotifications,
  useCurrentRole,
  useNavigation,
  useToast,
  useFridayBatch,
  useRevenueAtRisk,
  useNeedsDecision,
  useSlaOperational,
  useCashFriday,
};
