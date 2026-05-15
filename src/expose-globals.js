// Phase 2 bridge: feature files still read from window.EF*. This module is
// imported after the core ES modules but before any feature file, so the
// globals are populated before any IIFE-wrapped feature file references them.
// Phase 3 will delete this file and replace each `window.EF*` read inside
// feature files with a real ES import.

import * as Data from '../data.js'
import * as EFWorkflow from './core/workflow.js'
import * as EFEntities from './core/entities.js'
import store from './core/store.js'
import * as EFSelectors from './core/selectors.js'
import * as EFInternals from './core/internals.js'
import * as EFNotifications from './core/notifications.js'
import * as EFThreads from './core/threads.js'
import EFActions from './core/actions.js'
import * as EFHooks from './core/hooks.js'
import * as EFRoutes from './core/routes.js'
import * as EFU from '../utils.jsx'
import { EFDS } from '../utils.jsx'
import * as EFShell from '../shell.jsx'

window.EFStore = store
window.__store = store
window.EFWorkflow = EFWorkflow
window.EFEntities = EFEntities
window.EFSelectors = EFSelectors
window.EFInternals = EFInternals
window.EFNotifications = EFNotifications
window.EFThreads = EFThreads
window.EFActions = EFActions
window.EFHooks = EFHooks
window.EFRoutes = EFRoutes
window.EFU = EFU
window.EFDS = EFDS
window.EFShell = EFShell

Object.assign(window, {
  Icon: EFU.Icon, StatusPill: EFU.StatusPill, Avatar: EFU.Avatar,
  Money: EFU.Money, Bi: EFU.Bi, ScoreBar: EFU.ScoreBar, NotReady: EFU.NotReady,
  PlannedTag: EFU.PlannedTag, EmptyState: EFU.EmptyState, Skeleton: EFU.Skeleton,
  ChatNotice: EFU.ChatNotice, ChatMessage: EFU.ChatMessage,
  ChatComposer: EFU.ChatComposer, ChatThreadRow: EFU.ChatThreadRow,
  Sidebar: EFShell.Sidebar, Topbar: EFShell.Topbar, ToastStack: EFShell.ToastStack,
  CrumbBar: EFShell.CrumbBar, RoleSwitcher: EFShell.RoleSwitcher,
  NotifBell: EFShell.NotifBell, FridayWidget: EFShell.FridayWidget,
  TopbarClock: EFShell.TopbarClock, AdminGlobalBanners: EFShell.AdminGlobalBanners,
})

// window.EF — legacy data + live-store accessors (compat.js, inlined).
const EF = {
  GHOSTWRITERS: Data.GHOSTWRITERS,
  CUSTOMERS: Data.CUSTOMERS,
  ORDERS: Data.ORDERS,
  GW_DEMO_ASSIGNMENTS: Data.GW_DEMO_ASSIGNMENTS,
  SUBMISSIONS: Data.SUBMISSIONS,
  FRIDAY_BATCH: Data.FRIDAY_BATCH,
  INBOX_THREADS: Data.INBOX_THREADS,
  NOTIFICATIONS: Data.NOTIFICATIONS,
  WORK_TYPE_LABELS: Data.WORK_TYPE_LABELS,
  STATUS_PILLS: Data.STATUS_PILLS,
  FEATURE_FLAGS: Data.FEATURE_FLAGS,
  featureStatus: Data.featureStatus,
  isFeatureLive: Data.isFeatureLive,
  GW_ME: Data.GW_ME,
  liveOrders: () => EFSelectors.selectAllOrders(store.getState()),
  liveOrder: (id) => EFSelectors.selectOrder(store.getState(), id),
  releaseGates: EFWorkflow.releaseGates,
  myAssignments: () => EFSelectors.selectOrdersByGw(store.getState(), store.getState().session.gwId),
  gw: (id) => EFSelectors.selectGhostwriter(store.getState(), id),
  customer: (id) => EFSelectors.selectCustomer(store.getState(), id),
  order: (id) => EFSelectors.selectOrder(store.getState(), id),
}

function defineGetter(name, get) {
  Object.defineProperty(EF, name, { configurable: true, enumerable: true, get })
}
defineGetter('NOW', () => Data.liveNow())
defineGetter('DEMO_NOW', () => Data.liveNow())
defineGetter('ORDERS', () => EFSelectors.selectAllOrders(store.getState()))
defineGetter('SUBMISSIONS', () => EFSelectors.selectAllSubmissions(store.getState()))
defineGetter('CUSTOMERS', () => EFSelectors.selectAllCustomers(store.getState()))
defineGetter('GHOSTWRITERS', () => EFSelectors.selectAllGhostwriters(store.getState()))
defineGetter('INBOX_THREADS', () => EFSelectors.selectThreads(store.getState()))
defineGetter('NOTIFICATIONS', () => EFSelectors.selectNotifications(store.getState(), store.getState().session.role))
defineGetter('KPI', () => EFSelectors.selectKpis(store.getState()))

window.EF = EF
window.efNotify = EFActions.notify
