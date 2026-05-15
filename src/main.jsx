// Vite entry point. Loads all legacy IIFE modules in the same order as the
// old <script> tags in index.html, then mounts the App component.
//
// During Phase 1 the imports below are side-effect-only: each file publishes
// its exports onto window (e.g. window.EFStore, window.OrderDetail). Later
// phases will replace these with real ES imports.

import './setup-globals.js'

// Foundation: data, core layer, shell
import '../data.js'
import './core/workflow.js'
import './core/entities.js'
import './core/store.js'
import './core/selectors.js'
import './core/internals.js'
import './core/notifications.js'
import './core/threads.js'
import './core/actions.js'
import './core/hooks.js'
import './core/routes.js'
import './core/compat.js'
import '../utils.jsx'
import '../shell.jsx'

// Admin role
import './admin/dashboard.jsx'
import './admin/orders-list.jsx'
import './admin/order-detail.jsx'
import './admin/order-new-wizard.jsx'
import './admin/customers.jsx'
import './admin/customer-detail.jsx'
import './admin/ghostwriters.jsx'
import './admin/ghostwriter-detail.jsx'
import './admin/pipeline.jsx'
import './admin/disputes.jsx'
import './admin/offers.jsx'
import './admin/reports.jsx'
import './admin/settings.jsx'
import './admin/bi.jsx'
import './admin/inbox.jsx'
import './admin/friday-batch.jsx'

// Ghostwriter role
import './gw/dashboard.jsx'
import './gw/job-board.jsx'
import './gw/active-jobs.jsx'
import './gw/submit.jsx'
import './gw/assignment-detail.jsx'
import './gw/submissions-list.jsx'
import './gw/payments.jsx'
import './gw/messages.jsx'
import './gw/templates.jsx'
import './gw/profile.jsx'
import './gw/onboarding.jsx'
import './gw/first-contact.jsx'
import './gw/report-delay.jsx'
import './gw/extension-request.jsx'

// QA role (queue must load before order-detail because qa/order-detail
// uses SubmissionsTab from admin/order-detail)
import './qa/queue.jsx'
import './qa/order-detail.jsx'
import './qa/plagiarism.jsx'
import './qa/ai-detection.jsx'
import './qa/history.jsx'

// Customer role
import './customer/view.jsx'

// Dev tools
import './dev/tweaks-panel.jsx'

import React, { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'

// Components published to window by the IIFE-wrapped files above.
const {
  Sidebar, Topbar, ToastStack, TweaksPanel,
  AdminDashboard, OrdersTable, OrderDetail,
  FridayBatch, QAQueue, Inbox, AIBIDashboard,
  GhostwritersList, PipelineKanban,
  CustomersPage, DisputesPage, ReportsPage, SettingsPage,
  GWJobBoard, GWActiveJobs, GWSubmit, CustomerView,
  GWDashboard, GWPayments, GWTemplates, GWMessages, GWProfile, GWSubmissionsList, GWAssignmentDetail,
  GWReportDelay, GWExtensionRequest, GWFirstContact, GWOnboarding,
  QAPlagiarismReports, QAAIDetection, QAHistory, QAOrderDetail,
  OrderNewWizard, OffersPage, CustomerDetail, GhostwriterDetail,
  AdminGlobalBanners,
} = window

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "density": "compact",
  "locale": "both",
  "accent": "#1F62F0",
  "debug": false,
  "animateCounters": false
}/*EDITMODE-END*/

function parseHash() {
  return window.EFRoutes.parseHash()
}
function buildHash(role, name, params) {
  return window.EFRoutes.buildHash(role, name, params)
}

function App() {
  const init = parseHash()
  const [route, setRoute] = useState({ name: init.name, params: init.params })
  const [role, setRoleState] = useState(init.role)
  const [tweaks, setTweaksState] = useState(TWEAK_DEFAULTS)
  const [tweakOpen, setTweakOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  window.EFHooks.useStore(s => s.meta.version)

  useEffect(() => {
    window.EFActions.session.setRole(role)
    window.EFActions.session.setRoute(route)
  }, [role, route.name, route.params])

  useEffect(() => {
    const syncFromLocation = (scroll = false) => {
      const next = parseHash()
      setRoleState(next.role)
      setRoute({ name: next.name, params: next.params })
      window.EFActions.session.setRole(next.role)
      window.EFActions.session.setRoute({ name: next.name, params: next.params })
      if (scroll) window.scrollTo(0, 0)
    }

    const current = parseHash()
    const expected = buildHash(current.role, current.name, current.params)
    if (window.location.hash !== expected) {
      window.history.replaceState({ role: current.role, route: { name: current.name, params: current.params } }, '', expected)
    }

    const onNavigation = () => syncFromLocation(true)
    window.addEventListener('hashchange', onNavigation)
    window.addEventListener('popstate', onNavigation)
    return () => {
      window.removeEventListener('hashchange', onNavigation)
      window.removeEventListener('popstate', onNavigation)
    }
  }, [])

  const setTweak = useCallback((k, v) => {
    setTweaksState(prev => {
      const next = { ...prev, [k]: v }
      try { window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*') } catch(e){}
      return next
    })
  }, [])

  useEffect(() => {
    const onMsg = (e) => {
      if (!e.data) return
      if (e.data.type === '__activate_edit_mode') setTweakOpen(true)
      if (e.data.type === '__deactivate_edit_mode') setTweakOpen(false)
    }
    window.addEventListener('message', onMsg)
    try { window.parent.postMessage({ type: '__edit_mode_available' }, '*') } catch(e){}
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tweaks.theme)
    document.documentElement.setAttribute('data-density', tweaks.density)
    document.documentElement.setAttribute('data-locale', tweaks.locale)
    document.documentElement.style.setProperty('--blue', tweaks.accent)
  }, [tweaks.theme, tweaks.density, tweaks.locale, tweaks.accent])

  const applyRoute = useCallback((nextRole, name, params = {}, options = {}) => {
    const nextRoute = { name, params: params || {} }
    const nextHash = buildHash(nextRole, name, nextRoute.params)
    if (window.location.hash !== nextHash) {
      const method = options.replace ? 'replaceState' : 'pushState'
      window.history[method]({ role: nextRole, route: nextRoute }, '', nextHash)
    }
    setRoleState(nextRole)
    setRoute(nextRoute)
    window.EFActions.session.setRole(nextRole)
    window.EFActions.session.setRoute(nextRoute)
    if (options.scroll !== false) window.scrollTo(0, 0)
  }, [])

  const navigate = useCallback((name, params = {}) => {
    applyRoute(role, name, params)
  }, [applyRoute, role])

  const setRole = useCallback((nextRole) => {
    const nextName = window.EFRoutes.defaultRouteFor(nextRole)
    applyRoute(nextRole, nextName)
  }, [applyRoute])

  const toast = useCallback(({ text, tone = 'info', transition }) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, text, tone, transition }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000)
  }, [])

  useEffect(() => { window.efToast = toast; return () => { if (window.efToast === toast) delete window.efToast } }, [toast])

  const dismiss = (id) => setToasts(t => t.filter(x => x.id !== id))

  const routeTable = {
    customer: {
      _resolve: (params, name) => {
        const section = {
          'cust-orders': 'orders', 'cust-messages': 'messages', 'cust-invoices': 'invoices',
          'cust-downloads': 'downloads', 'cust-profile': 'profile', 'admin-dashboard': 'orders',
        }[name] || 'orders'
        return <CustomerView role={role} setRole={setRole} navigate={navigate} toast={toast} section={section}/>
      },
    },
    qa: {
      'qa-queue':         () => <QAQueue navigate={navigate} toast={toast}/>,
      'qa':               () => <QAQueue navigate={navigate} toast={toast}/>,
      'admin-dashboard':  () => <QAQueue navigate={navigate} toast={toast}/>,
      'qa-plagiarism':    () => <QAPlagiarismReports navigate={navigate}/>,
      'qa-ai':            () => <QAAIDetection navigate={navigate}/>,
      'qa-history':       () => <QAHistory navigate={navigate}/>,
      'order-detail':     (p) => <QAOrderDetail orderId={p.id} navigate={navigate} toast={toast}/>,
      _default:           () => <QAQueue navigate={navigate} toast={toast}/>,
    },
    gw: {
      'gw-dashboard':         () => <GWDashboard navigate={navigate}/>,
      'admin-dashboard':      () => <GWDashboard navigate={navigate}/>,
      'gw-active':            () => <GWActiveJobs navigate={navigate}/>,
      'orders':               () => <GWActiveJobs navigate={navigate}/>,
      'gw-job-board':         () => <GWJobBoard navigate={navigate} toast={toast}/>,
      'gw-submit':            (p) => <GWSubmit orderId={p.id} kind={p.kind} navigate={navigate} toast={toast}/>,
      'gw-report-delay':      (p) => <GWReportDelay orderId={p.id} navigate={navigate} toast={toast}/>,
      'gw-extension':         (p) => <GWExtensionRequest orderId={p.id} navigate={navigate} toast={toast}/>,
      'gw-first-contact':     (p) => <GWFirstContact orderId={p.id} navigate={navigate} toast={toast}/>,
      'gw-onboarding':        () => <GWOnboarding navigate={navigate} toast={toast}/>,
      'gw-submissions-list':  () => <GWSubmissionsList navigate={navigate}/>,
      'gw-templates':         () => <GWTemplates/>,
      'gw-payments':          () => <GWPayments navigate={navigate}/>,
      'gw-messages':          () => <GWMessages navigate={navigate}/>,
      'gw-profile':           () => <GWProfile/>,
      'gw-assignment-detail': (p) => <GWAssignmentDetail orderId={p.id} navigate={navigate} toast={toast}/>,
      'order-detail':         (p) => <GWAssignmentDetail orderId={p.id} navigate={navigate} toast={toast}/>,
      _default:               () => <GWDashboard navigate={navigate}/>,
    },
    admin: {
      'admin-dashboard':    () => <AdminDashboard navigate={navigate} openFridayBatch={() => navigate('friday-batch')}/>,
      'orders':             () => <OrdersTable navigate={navigate} route={route}/>,
      'order-detail':       (p) => <OrderDetail orderId={p.id} initialTab={p.tab} navigate={navigate} toast={toast}/>,
      'friday-batch':       () => <FridayBatch navigate={navigate} toast={toast}/>,
      'qa':                 () => <QAQueue navigate={navigate} toast={toast}/>,
      'inbox':              () => <Inbox toast={toast} route={route}/>,
      'ai-bi':              () => <AIBIDashboard/>,
      'gw-job-board':       () => <GWJobBoard navigate={navigate} toast={toast} role="admin"/>,
      'ghostwriters':       () => <GhostwritersList navigate={navigate}/>,
      'ghostwriter-detail': (p) => <GhostwriterDetail gwId={p.id} navigate={navigate} toast={toast}/>,
      'pipeline':           () => <PipelineKanban navigate={navigate}/>,
      'customers':          () => <CustomersPage navigate={navigate}/>,
      'customer-detail':    (p) => <CustomerDetail customerId={p.id} navigate={navigate}/>,
      'disputes':           () => <DisputesPage navigate={navigate}/>,
      'reports':            () => <ReportsPage navigate={navigate}/>,
      'settings':           () => <SettingsPage navigate={navigate} toast={toast}/>,
      'order-new':          () => <OrderNewWizard navigate={navigate} toast={toast}/>,
      'offers':             () => <OffersPage navigate={navigate} toast={toast}/>,
      _default:             () => <AdminDashboard navigate={navigate} openFridayBatch={() => navigate('friday-batch')}/>,
    },
  }

  const roleRoutes = routeTable[role] || routeTable.admin
  const params = route.params || {}
  let body
  if (roleRoutes._resolve) {
    body = roleRoutes._resolve(params, route.name)
  } else {
    const handler = roleRoutes[route.name] || roleRoutes._default
    body = handler(params)
  }

  const tweakPanel = tweakOpen && <TweaksPanel tweaks={tweaks} setTweak={setTweak} onClose={() => { setTweakOpen(false); try { window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*') } catch(e){} }}/>

  if (role === 'customer') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {body}
        {tweakPanel}
        <ToastStack toasts={toasts} onDismiss={dismiss}/>
      </div>
    )
  }

  return (
    <div className="app-root">
      <Sidebar route={route} navigate={navigate} role={role}/>
      <div className="app-main">
        <Topbar role={role} setRole={setRole} navigate={navigate} toast={toast}/>
        {role === 'admin' && <AdminGlobalBanners navigate={navigate}/>}
        <div className="content-area">
          {body}
        </div>
      </div>
      {tweakPanel}
      <ToastStack toasts={toasts} onDismiss={dismiss}/>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
