// React hooks over the store/selectors.
import React from 'react';
import store from './store.js';
import * as S from './selectors.js';
import * as W from './workflow.js';
import * as Comms from './comms.js';
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

// ---- Communication hooks (D-28) -------------------------------------------

function useOrderChat(orderId) {
  const selector = React.useMemo(() => (state) => Comms.select.orderChat(state, orderId), [orderId]);
  return useStore(selector, shallowEqual);
}

function useExternalContacts() {
  return useStore(Comms.select.externalContacts, shallowEqual);
}

function useAllExternalMessages() {
  return useStore(Comms.select.allExternalMessages, shallowEqual);
}

function useContactMessages(contactType, contactId) {
  const selector = React.useMemo(
    () => (state) => Comms.select.externalMessagesForContact(state, contactType, contactId),
    [contactType, contactId]
  );
  return useStore(selector, shallowEqual);
}

function useContactInternalNotes(contactType, contactId) {
  const selector = React.useMemo(
    () => (state) => Comms.select.internalNotesForContact(state, contactType, contactId),
    [contactType, contactId]
  );
  return useStore(selector, shallowEqual);
}

function useContactEntity(contactType, contactId) {
  const selector = React.useMemo(
    () => (state) => Comms.select.resolveContactEntity(state, contactType, contactId),
    [contactType, contactId]
  );
  return useStore(selector, shallowEqual);
}

function useNotifications(role) {
  const selector = React.useMemo(() => (state) => S.selectNotifications(state, role || state.session.role), [role]);
  return useStore(selector, shallowEqual);
}

function useChatReports() {
  return useStore(S.selectAllChatReports, shallowEqual);
}

function useChatReport(reportId) {
  const selector = React.useMemo(() => (state) => S.selectChatReport(state, reportId), [reportId]);
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

// ---- Meeting hooks --------------------------------------------------------

function _selectAllSlots(state) {
  const t = state.entities.meeting_slots;
  if (!t) return [];
  return t.allIds.map(id => t.byId[id]).filter(s => !s.isRemoved);
}

function _selectAllMeetings(state) {
  const t = state.entities.meetings;
  if (!t) return [];
  return t.allIds.map(id => t.byId[id]);
}

function _selectPendingMeetings(state) {
  const t = state.entities.meetings;
  if (!t) return [];
  return t.allIds.map(id => t.byId[id]).filter(m => m.status === 'pending_approval');
}

function useAllSlots() {
  return useStore(_selectAllSlots, shallowEqual);
}

function useAllMeetings() {
  return useStore(_selectAllMeetings, shallowEqual);
}

function usePendingMeetings() {
  return useStore(_selectPendingMeetings, shallowEqual);
}

// Scoped to one requester side: a customer's meeting on an order must not
// surface in the GW's booking card for the same order (and vice versa).
function useMeetingByOrder(orderId, requesterRole) {
  const selector = React.useMemo(
    () => state => {
      const t = state.entities.meetings;
      if (!t) return null;
      return t.allIds.map(id => t.byId[id]).find(
        m => m.orderId === orderId
          && m.requesterRole === requesterRole
          && (m.status === 'scheduled' || m.status === 'pending_approval')
      ) || null;
    },
    [orderId, requesterRole]
  );
  return useStore(selector, shallowEqual);
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
  useOrderChat,
  useExternalContacts,
  useAllExternalMessages,
  useContactMessages,
  useContactInternalNotes,
  useContactEntity,
  useNotifications,
  useCurrentRole,
  useNavigation,
  useToast,
  useFridayBatch,
  useRevenueAtRisk,
  useNeedsDecision,
  useSlaOperational,
  useCashFriday,
  useChatReports,
  useChatReport,
  useAllSlots,
  useAllMeetings,
  usePendingMeetings,
  useMeetingByOrder,
};
