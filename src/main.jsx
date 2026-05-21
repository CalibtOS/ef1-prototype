// Vite entry point. Everything is a real ES module — no globals, no IIFEs,
// no `window.*` bridges. Action handlers reach the toast queue through
// `core/toast.js`, which is wired here.

import './core/dom-safety.js'
import React, { useState, useEffect, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import EFActions from './core/actions.js'
import * as EFHooks from './core/hooks.js'
import * as EFRoutes from './core/routes.js'
import store from './core/store.js'
import * as Scenarios from './sim/scenarios.js'
import * as SimMail from './sim/mail.js'
import { setEmitter as setToastEmitter } from './core/toast.js'
import { Sidebar, Topbar, ToastStack, AdminGlobalBanners } from '../shell.jsx'

// Dev-only bridge for end-to-end propagation testing from the preview eval
// context. Never exposed in production builds. Read-only access to the live
// app store + canonical actions; lets verification scripts reach the same
// module instance the React tree consumes.
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__EF_DEV__ = Object.freeze({
    store, Actions: EFActions, Scenarios, SimMail,
  })
}

// Per-role route registry. Mirrors the keys of `routeTable[role]` below; any
// route name not listed here will silently fall through to `_default` (the
// role's home view). Kept at module scope so `applyRoute` can warn in dev when
// it receives a (role, name) pair that doesn't actually have a handler — that
// silent fall-through used to mask wiring bugs (notif builders shipping the
// wrong role/route combo). See audit Arch-10.
const VALID_ROUTES_BY_ROLE = {
  admin: new Set([
    'admin-dashboard', 'orders', 'order-detail', 'friday-batch', 'qa', 'inbox',
    'ai-bi', 'gw-job-board', 'ghostwriters', 'ghostwriter-detail', 'pipeline',
    'admin-calendar', 'customers', 'customer-detail', 'disputes', 'reports',
    'settings', 'order-new', 'offers',
  ]),
  gw: new Set([
    'gw-dashboard', 'admin-dashboard', 'gw-active', 'orders', 'gw-job-board',
    'gw-submit', 'gw-report-delay', 'gw-extension', 'gw-first-contact',
    'gw-onboarding', 'gw-submissions-list', 'gw-templates', 'gw-payments',
    'gw-messages', 'gw-profile', 'gw-assignment-detail', 'order-detail',
    'gw-calendar',
  ]),
  qa: new Set([
    'qa-queue', 'qa', 'admin-dashboard', 'qa-plagiarism', 'qa-ai', 'qa-history',
    'order-detail',
  ]),
  customer: new Set([
    'cust-orders', 'cust-messages', 'cust-invoices', 'cust-downloads',
    'cust-profile', 'admin-dashboard',
  ]),
  wp: new Set(['wp-hausarbeit', 'wp-vielen-dank']),
  sim: new Set(['sim-stripe-checkout']),
};

// Admin role
import { AdminDashboard } from './admin/dashboard.jsx'
import { OrdersTable } from './admin/orders-list.jsx'
import { OrderDetail } from './admin/order-detail.jsx'
import { OrderNewWizard } from './admin/order-new-wizard.jsx'
import { CustomersPage } from './admin/customers.jsx'
import { CustomerDetail } from './admin/customer-detail.jsx'
import { GhostwritersList } from './admin/ghostwriters.jsx'
import { GhostwriterDetail } from './admin/ghostwriter-detail.jsx'
import { PipelineKanban } from './admin/pipeline.jsx'
import { DisputesPage } from './admin/disputes.jsx'
import { OffersPage } from './admin/offers.jsx'
import { ReportsPage } from './admin/reports.jsx'
import { SettingsPage } from './admin/settings.jsx'
import { AIBIDashboard } from './admin/bi.jsx'
import { Inbox } from './admin/inbox.jsx'
import { FridayBatch } from './admin/friday-batch.jsx'
import { AdminCalendar } from './admin/calendar.jsx'

// Ghostwriter role
import { GWDashboard } from './gw/dashboard.jsx'
import { GWJobBoard } from './gw/job-board.jsx'
import { GWActiveJobs } from './gw/active-jobs.jsx'
import { GWSubmit } from './gw/submit.jsx'
import { GWAssignmentDetail } from './gw/assignment-detail.jsx'
import { GWSubmissionsList } from './gw/submissions-list.jsx'
import { GWPayments } from './gw/payments.jsx'
import { GWMessages } from './gw/messages.jsx'
import { GWTemplates } from './gw/templates.jsx'
import { GWProfile } from './gw/profile.jsx'
import { GWOnboarding } from './gw/onboarding.jsx'
import { GWFirstContact } from './gw/first-contact.jsx'
import { GWReportDelay } from './gw/report-delay.jsx'
import { GWExtensionRequest } from './gw/extension-request.jsx'
import { GWCalendar } from './gw/calendar.jsx'
import { GWTimeline } from './gw/timeline.jsx'

// QA role
import { QAQueue } from './qa/queue.jsx'
import { QAOrderDetail } from './qa/order-detail.jsx'
import { QAPlagiarismReports } from './qa/plagiarism.jsx'
import { QAAIDetection } from './qa/ai-detection.jsx'
import { QAHistory } from './qa/history.jsx'

// Customer role
import { CustomerView } from './customer/view.jsx'

// WP simulation
import { WpHausarbeit } from './wp/hausarbeit.jsx'
import { WpVielenDank } from './wp/vielen-dank.jsx'

// Simulated Stripe checkout (outside product shell)
import { FakeStripeCheckout } from './sim/stripe-checkout-page.jsx'

// Demo harness (outside product shell)
import { DemoHarnessBar } from './demo-harness/bar.jsx'

// Simulation effects subscribe to domain events on import
import './sim/effects.js'

// Dev tools
import { TweaksPanel } from './dev/tweaks-panel.jsx'

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "density": "compact",
  "locale": "both",
  "accent": "#1F62F0",
  "debug": false,
  "animateCounters": false
}/*EDITMODE-END*/

function parseHash() { return EFRoutes.parseHash() }
function buildHash(role, name, params) { return EFRoutes.buildHash(role, name, params) }

function App() {
  const init = parseHash()
  const [route, setRoute] = useState({ name: init.name, params: init.params })
  const [role, setRoleState] = useState(init.role)
  const [tweaks, setTweaksState] = useState(TWEAK_DEFAULTS)
  const [tweakOpen, setTweakOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('ef-sidebar-collapsed') === '1' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem('ef-sidebar-collapsed', sidebarCollapsed ? '1' : '0') } catch {}
  }, [sidebarCollapsed])
  EFHooks.useStore(s => s.meta.version)

  useEffect(() => {
    EFActions.session.setRole(role)
    EFActions.session.setRoute(route)
  }, [role, route.name, route.params])

  useEffect(() => {
    const syncFromLocation = (scroll = false) => {
      const next = parseHash()
      setRoleState(next.role)
      setRoute({ name: next.name, params: next.params })
      EFActions.session.setRole(next.role)
      EFActions.session.setRoute({ name: next.name, params: next.params })
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
    if (import.meta.env?.DEV) {
      const valid = VALID_ROUTES_BY_ROLE[nextRole];
      if (valid && name && !valid.has(name)) {
        console.warn(`[applyRoute] no handler for (${nextRole}, ${name}); falling back to ${nextRole}'s default. Caller passed:`, { params, options });
      } else if (!valid) {
        console.warn(`[applyRoute] unknown role "${nextRole}"; will use admin route table.`);
      }
    }
    const nextRoute = { name, params: params || {} }
    const nextHash = buildHash(nextRole, name, nextRoute.params)
    if (window.location.hash !== nextHash) {
      const method = options.replace ? 'replaceState' : 'pushState'
      window.history[method]({ role: nextRole, route: nextRoute }, '', nextHash)
    }
    setRoleState(nextRole)
    setRoute(nextRoute)
    EFActions.session.setRole(nextRole)
    EFActions.session.setRoute(nextRoute)
    if (options.scroll !== false) window.scrollTo(0, 0)
  }, [])

  const navigate = useCallback((name, params = {}, options = {}) => {
    applyRoute(role, name, params, options)
  }, [applyRoute, role])

  const harnessGoTo = useCallback((targetRole, name, params = {}) => {
    applyRoute(targetRole || role, name, params)
  }, [applyRoute, role])

  const setRole = useCallback((nextRole) => {
    const nextName = EFRoutes.defaultRouteFor(nextRole)
    applyRoute(nextRole, nextName)
  }, [applyRoute])

  // Atomic persona switch driven by the dropdown. Patches store identity
  // (customerId/gwId) first, then flips role/route so the new persona is in
  // place before route-dependent views re-render.
  const selectPersona = useCallback((persona) => {
    if (!persona) return
    if (persona.customerId || persona.gwId) {
      EFActions.session.setPersona({ customerId: persona.customerId, gwId: persona.gwId })
    }
    const nextName = EFRoutes.defaultRouteFor(persona.role)
    applyRoute(persona.role, nextName)
  }, [applyRoute])

  const toast = useCallback(({ text, tone = 'info', transition }) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, text, tone, transition }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000)
  }, [])

  useEffect(() => {
    setToastEmitter(toast)
    return () => setToastEmitter(null)
  }, [toast])

  const dismiss = (id) => setToasts(t => t.filter(x => x.id !== id))

  const routeTable = {
    customer: {
      _resolve: (params, name) => {
        const section = {
          'cust-orders': 'orders', 'cust-messages': 'messages', 'cust-invoices': 'invoices',
          'cust-downloads': 'downloads', 'cust-profile': 'profile', 'admin-dashboard': 'orders',
        }[name] || 'orders'
        const goTo = (r, n, p = {}) => harnessGoTo(r, n || EFRoutes.defaultRouteFor(r), p)
        const focusOrderId = params?.orderId != null ? Number(params.orderId) : null
        const focusOrderTab = params?.tab || null
        return <CustomerView role={role} setRole={setRole} selectPersona={selectPersona} navigate={navigate} toast={toast} section={section} goTo={goTo} focusOrderId={focusOrderId} focusOrderTab={focusOrderTab}/>
      },
    },
    qa: {
      'qa-queue':         () => <QAQueue navigate={navigate} toast={toast}/>,
      'qa':               () => <QAQueue navigate={navigate} toast={toast}/>,
      'admin-dashboard':  () => <QAQueue navigate={navigate} toast={toast}/>,
      'qa-plagiarism':    () => <QAPlagiarismReports navigate={navigate}/>,
      'qa-ai':            () => <QAAIDetection navigate={navigate}/>,
      'qa-history':       () => <QAHistory navigate={navigate}/>,
      'order-detail':     (p) => <QAOrderDetail orderId={p.id} initialTab={p.tab} navigate={navigate} toast={toast}/>,
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
      'gw-calendar':          () => <GWCalendar navigate={navigate}/>,
      'gw-timeline':          () => <GWTimeline navigate={navigate}/>,
      _default:               () => <GWDashboard navigate={navigate}/>,
    },
    wp: {
      'wp-hausarbeit':  () => <WpHausarbeit navigate={navigate}/>,
      'wp-vielen-dank': (p) => <WpVielenDank navigate={navigate} params={p} switchRole={(r, name, params) => harnessGoTo(r, name || EFRoutes.defaultRouteFor(r), params || {})}/>,
      _default:         () => <WpHausarbeit navigate={navigate}/>,
    },
    sim: {
      'sim-stripe-checkout': (p) => <FakeStripeCheckout params={p} navigate={navigate} switchRole={(r, name, params) => harnessGoTo(r, name || EFRoutes.defaultRouteFor(r), params || {})}/>,
      _default:              (p) => <FakeStripeCheckout params={p} navigate={navigate} switchRole={(r, name, params) => harnessGoTo(r, name || EFRoutes.defaultRouteFor(r), params || {})}/>,
    },
    admin: {
      'admin-dashboard':    () => <AdminDashboard navigate={navigate} openFridayBatch={() => navigate('friday-batch')}/>,
      'orders':             () => <OrdersTable navigate={navigate} route={route}/>,
      'order-detail':       (p) => <OrderDetail orderId={p.id} initialTab={p.tab} focusSubmissionId={p.submissionId} navigate={navigate} toast={toast}/>,
      'friday-batch':       () => <FridayBatch navigate={navigate} toast={toast}/>,
      'qa':                 (p) => <QAQueue navigate={navigate} toast={toast} initialOrderId={p.orderId ? Number(p.orderId) : undefined}/>,
      'inbox':              () => <Inbox toast={toast} route={route}/>,
      'ai-bi':              () => <AIBIDashboard/>,
      'gw-job-board':       () => <GWJobBoard navigate={navigate} toast={toast} role="admin"/>,
      'ghostwriters':       () => <GhostwritersList navigate={navigate}/>,
      'ghostwriter-detail': (p) => <GhostwriterDetail gwId={p.id} navigate={navigate} toast={toast}/>,
      'pipeline':           () => <PipelineKanban navigate={navigate}/>,
      'admin-calendar':     () => <AdminCalendar navigate={navigate}/>,
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

  const harnessBar = (
    <DemoHarnessBar role={role} navigate={(name, params) => harnessGoTo(role, name, params)} switchRole={(r, name, params) => harnessGoTo(r, name || EFRoutes.defaultRouteFor(r), params || {})}/>
  )

  if (role === 'wp' || role === 'sim') {
    return (
      <div style={{ minHeight: '100vh', background: '#f7f8fb' }}>
        {harnessBar}
        {body}
        {tweakPanel}
        <ToastStack toasts={toasts} onDismiss={dismiss}/>
      </div>
    )
  }

  if (role === 'customer') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {harnessBar}
        {body}
        {tweakPanel}
        <ToastStack toasts={toasts} onDismiss={dismiss}/>
      </div>
    )
  }

  return (
    <div className="app-root">
      <Sidebar route={route} navigate={navigate} role={role} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed}/>
      <div className="app-main">
        {harnessBar}
        <Topbar role={role} setRole={setRole} selectPersona={selectPersona} navigate={navigate} toast={toast}/>
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

const rootElement = document.getElementById('root')
const root = rootElement.__efRoot || createRoot(rootElement)
rootElement.__efRoot = root
root.render(<App />)
