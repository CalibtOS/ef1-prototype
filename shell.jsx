// Shell — sidebar, topbar, role switcher, toast host, notifications
import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import {
  Icon, StatusPill, Avatar, Money, Bi, EUR, fmtDate, fmtDateTime, fmtTime,
  relTime, daysTo, deadlineMeta, ScoreBar, useNow, fmtClock, fmtWeekdayDate,
  fridayBatchLabel,
} from './utils.jsx';
import * as EFRoutes from './src/core/routes.js';
import store from './src/core/store.js';
import * as EFHooks from './src/core/hooks.js';
import EFActions from './src/core/actions.js';
import { inferOrderId as notificationOrderId } from './src/core/notifications.js';

// App-wide context
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

const ROLES = [
  { id: 'admin', label: 'Admin', user: 'Berat Özdemir', initials: 'BÖ', email: 'berat@efactory1.de' },
  { id: 'gw', label: 'Ghostwriter', user: 'Isabel Walter', initials: 'IW', email: 'isabel.walter@gw.efactory1.de' },
  { id: 'qa', label: 'QA Reviewer', user: 'Lina Hoffmann', initials: 'LH', email: 'qa@efactory1.de' },
  { id: 'customer', label: 'Customer', user: 'Antigona Berisha', initials: 'AB', email: 'antigona.berisha@example.com' },
];

// Build nav lazily so badges reflect current ORDERS / SUBMISSIONS data.
function buildNav(role) {
  return EFRoutes.navItems(role, store.getState());
}

function Sidebar({ role, route, navigate, collapsed, setCollapsed }) {
  EFHooks.useStore(s => s.meta.version);
  const nav = buildNav(role);
  const roleMeta = ROLES.find(r => r.id === role) || ROLES[0];
  // Map nav item ids to internal route names
  const routeMap = EFRoutes.NAV_ROUTE_MAP;
  const activeId = Object.entries(routeMap).find(([, v]) => v === route?.name)?.[0] || route?.name;
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="brand-mark">e1</div>
        {!collapsed && (
          <div className="flex-col" style={{ lineHeight: 1.2 }}>
            <span className="brand-name">eFactory One</span>
            <span className="brand-sub">Bery Ventures GmbH</span>
          </div>
        )}
      </div>
      <nav className="sidebar-section" aria-label={`${roleMeta.label} navigation`} style={{ flex: 1, overflowY: 'auto' }}>
        {!collapsed && <div className="sidebar-section-label">{roleMeta.label}</div>}
        {nav.map(item => (
          <button
            type="button"
            key={item.id}
            className={`sidebar-item ${activeId === item.id ? 'active' : ''}`}
            aria-current={activeId === item.id ? 'page' : undefined}
            onClick={() => navigate && navigate(routeMap[item.id] || item.id)}
          >
            <Icon name={item.icon} size={16} />
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.tag && <span className="badge" style={{ background: 'color-mix(in oklab, var(--blue) 14%, transparent)', color: 'var(--blue)' }}>{item.tag}</span>}
            {!collapsed && item.badge && (
              <span className={`badge ${item.badgeTone === 'warn' ? 'badge-warn' : ''} ${item.badgeTone === 'danger' ? 'badge-danger' : ''}`}>{item.badge}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <Avatar initials={roleMeta.initials} size={28} tone="blue" />
          {!collapsed && (
            <div className="flex-col" style={{ overflow: 'hidden', flex: 1 }}>
              <span className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roleMeta.user}</span>
              <span className="sidebar-user-role">{roleMeta.email}</span>
            </div>
          )}
          {!collapsed && <Icon name="chevron-down" size={14} className="text-faint" />}
        </div>
      </div>
    </aside>
  );
}

function RoleSwitcher({ role, setRole }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  const cur = ROLES.find(r => r.id === role);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="role-switcher" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Avatar initials={cur.initials} size={22} tone="blue" />
        <div className="flex-col" style={{ lineHeight: 1.2 }}>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Viewing as</span>
          <span style={{ fontSize: 12, fontWeight: 500 }}>{cur.label}</span>
        </div>
        <Icon name="chevron-down" size={14} className="text-faint" />
      </button>
      {open && (
        <div role="listbox" aria-label="Demo persona" style={{ position: 'absolute', top: 40, right: 0, width: 240, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 50, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border)' }}>Demo persona</div>
          {ROLES.map(r => (
            <button type="button" role="option" aria-selected={r.id === role} key={r.id} onClick={() => { setRole(r.id); setOpen(false); }} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', display: 'flex', gap: 10, cursor: 'pointer', alignItems: 'center', borderBottom: '1px solid var(--border)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', background: 'transparent', font: 'inherit', color: 'inherit' }} onMouseEnter={(e)=>e.currentTarget.style.background='var(--surface-2)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}>
              <Avatar initials={r.initials} size={28} tone={r.id === role ? 'blue' : 'neutral'} />
              <div className="flex-col" style={{ flex: 1 }}>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>{r.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.user}</span>
              </div>
              {r.id === role && <Icon name="check" size={14} className="text-faint" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function adminNotificationTab(kind) {
  if (['claim_pending_your_approval', 'claim_rejected', 'assignment_approved', 'assignment_intro', 'assignment_cancelled'].includes(kind)) return 'assignment';
  if (['final_uploaded', 'revision_required', 'qa_passed', 'interim_received', 'interim_approved', 'interim_uploaded_auto_forwarded'].includes(kind)) return 'submissions';
  if (['invoice_unpaid_5d', 'payment_confirmed', 'invoice_sent', 'final_accepted'].includes(kind)) return 'payments';
  if (['offer_sent', 'offer_stale'].includes(kind)) return 'offer';
  return null;
}

function customerNotificationTab(kind) {
  if (['message_received', 'message_redirected'].includes(kind)) return 'messages';
  if (['payment_confirmed', 'payment_released', 'invoice_sent', 'invoice_unpaid_5d'].includes(kind)) return 'payments';
  if (['qa_passed', 'final_uploaded', 'interim_received', 'violation_cleared'].includes(kind)) return 'files';
  return 'status';
}

function resolveNotificationTarget(n, role) {
  if (!n) return null;
  if (n.route) return { name: n.route, params: n.params || {} };

  const kind = n.kind || 'event';
  const orderId = notificationOrderId(n);

  if (kind === 'subscriber_limit_warning') return { name: 'settings', params: {} };
  if (kind === 'gw_shadow_ban') return { name: 'ghostwriters', params: {} };

  if (['message_received', 'message_redirected'].includes(kind)) {
    if (role === 'customer') {
      return orderId ? { customerOrderId: orderId, tab: 'messages' } : { customerSection: 'messages' };
    }
    if (role === 'gw') return { name: 'gw-messages', params: orderId ? { orderId } : {} };
    return { name: 'inbox', params: n.threadId ? { thread: n.threadId } : (orderId ? { orderId } : {}) };
  }

  if (role === 'customer') {
    return orderId
      ? { customerOrderId: orderId, tab: customerNotificationTab(kind) }
      : { customerSection: kind === 'payment_confirmed' ? 'invoices' : 'orders' };
  }

  if (role === 'qa') {
    return orderId ? { name: 'order-detail', params: { id: orderId } } : { name: 'qa-queue', params: {} };
  }

  if (role === 'gw') {
    if (kind === 'payment_released') return { name: 'gw-payments', params: {} };
    if (['claim_rejected', 'assignment_cancelled', 'order_cancelled', 'order_on_hold'].includes(kind)) return { name: 'gw-active', params: {} };
    if (kind === 'revision_required' && orderId) return { name: 'gw-submit', params: { id: orderId, kind: 'revision' } };
    return orderId ? { name: 'gw-assignment-detail', params: { id: orderId } } : { name: 'gw-dashboard', params: {} };
  }

  if (orderId) {
    const params = { id: orderId };
    const tab = adminNotificationTab(kind);
    if (tab) params.tab = tab;
    return { name: 'order-detail', params };
  }

  if (kind === 'order_created') return { name: 'orders', params: {} };
  return { name: 'admin-dashboard', params: {} };
}

function NotifBell({ notifications, onMark, onOpen, role }) {
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const ref = useRef();
  const lastCount = useRef(notifications.filter(n => !n.read).length);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Shake when unread count grows
  useEffect(() => {
    const u = notifications.filter(n => !n.read).length;
    if (u > lastCount.current) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 800);
      lastCount.current = u;
      return () => clearTimeout(t);
    }
    lastCount.current = u;
  }, [notifications]);

  const unread = notifications.filter(n => !n.read).length;
  const handleOpen = (n) => {
    EFActions?.notifications?.markRead?.(n.id, role);
    if (onOpen) onOpen(n);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="icon-btn" onClick={() => setOpen(!open)} aria-label={`Notifications (${unread} unread)`}>
        <span className={shake ? 'ef-bell-shake' : ''} style={{ display: 'inline-flex' }}>
          <Icon name="bell" size={16} />
        </span>
        {unread > 0 && <span className="dot-badge" />}
      </button>
      {open && (
        <div className="notif-pop">
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 13 }}>Notifications</strong>
            <button type="button" className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onMark && onMark(); }}>Mark all read</button>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {notifications.map(n => (
              <button type="button" key={n.id} className={`notif-item ${n.read ? 'read' : ''} ${n.urgent ? 'urgent' : ''}`} onClick={() => handleOpen(n)}>
                <div className="notif-dot" />
                <div style={{ flex: 1 }}>
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-body">{n.body}</div>
                  <div className="notif-time">{relTime(n.at)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TopbarClock() {
  const now = useNow(1000);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time';
  return (
    <div className="topbar-clock" title={`Local browser time · ${tz}`}>
      <Icon name="clock" size={13} className="text-faint" aria-hidden/>
      <span className="mono">{fmtClock(now)}</span>
      <span className="topbar-clock-date">{fmtWeekdayDate(now)}</span>
    </div>
  );
}

function FridayWidget({ onClick }) {
  // Derive counts from the shared store so the widget never lies.
  const k = EFHooks.useKpis();
  const now = useNow(60000);
  return (
    <button type="button" className="friday-widget" onClick={onClick} title="Open Friday batch">
      <span className="friday-dot" />
      <span className="text-strong">Friday batch {fridayBatchLabel(now)}</span>
      <span className="text-faint" style={{ fontFamily: 'JetBrains Mono, monospace' }}>· {k.fridayCount} releasable · {EUR(k.fridayEur)}</span>
    </button>
  );
}

function ToastHost({ toasts }) {
  return (
    <div className="toast-host">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.tone || ''}`}>
          {t.tone === 'success' && <Icon name="check" size={16} />}
          {t.tone === 'danger' && <Icon name="alert-triangle" size={16} />}
          {!t.tone && <Icon name="zap" size={16} />}
          <span style={{ flex: 1 }}>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

function CrumbBar({ trail }) {
  return (
    <div className="crumbs">
      {trail.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Icon name="chevron-right" size={12} className="crumb-sep" />}
          <span className={i === trail.length - 1 ? 'crumb-current' : ''}>{c}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

// Persistent admin-only banner: Pipedrive subscriber limit warning
function AdminGlobalBanners({ navigate }) {
  const [dismissed, setDismissed] = useState(false);
  const subs = EFHooks.useKpis().pipedriveSubs || '4,159 / 5,000';
  if (dismissed) return null;
  return (
    <div style={{ background: 'color-mix(in oklab, var(--amber) 10%, var(--surface))', borderBottom: '1px solid color-mix(in oklab, var(--amber) 30%, var(--border))', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
      <Icon name="alert-triangle" size={14} style={{ color: 'var(--amber)' }}/>
      <span><strong>Pipedrive subscriber limit:</strong> {subs} (83%) — clean up before next campaign or upgrade plan.</span>
      <span style={{ flex: 1 }}/>
      <button type="button" className="btn btn-sm" onClick={() => navigate('settings')}>Open Pipedrive settings</button>
      <button type="button" className="btn btn-sm" aria-label="Dismiss" onClick={() => setDismissed(true)}><Icon name="x" size={12}/></button>
    </div>
  );
}

// Topbar
function Topbar({ role, setRole, navigate, toast }) {
  const isAdmin = role === 'admin';
  const notifs = EFHooks.useNotifications(role);
  const openNotification = (n) => {
    const target = resolveNotificationTarget(n, role);
    if (target?.name) navigate(target.name, target.params || {});
  };
  return (
    <div className="topbar">
      <div style={{ flex: 1 }}/>
      <TopbarClock />
      {isAdmin && <FridayWidget onClick={() => navigate('friday-batch')}/>}
      <NotifBell
        role={role}
        notifications={notifs}
        onMark={() => EFActions.notifications.markAllRead(role)}
        onOpen={openNotification}
      />
      <RoleSwitcher role={role} setRole={setRole}/>
    </div>
  );
}

// ToastStack
function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-host">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.tone || ''}`} onClick={() => onDismiss(t.id)}>
          {t.tone === 'success' && <Icon name="check" size={16}/>}
          {t.tone === 'danger' && <Icon name="alert-triangle" size={16}/>}
          {t.tone === 'info' && <Icon name="zap" size={16}/>}
          {!t.tone && <Icon name="zap" size={16}/>}
          {t.transition ? (
            <div className="toast-transition" style={{ flex: 1 }}>
              {t.transition.entity && <span className="tt-entity">{t.transition.entity}</span>}
              <span className="tt-row">
                <span className="tt-from">{t.transition.from}</span>
                <span className="tt-arrow"><Icon name="arrow-right" size={12}/></span>
                <span className="tt-to">{t.transition.to}</span>
              </span>
              {t.text && <span className="tt-entity">{t.text}</span>}
            </div>
          ) : (
            <span style={{ flex: 1 }}>{t.text}</span>
          )}
          <Icon name="x" size={12} className="text-faint"/>
        </div>
      ))}
    </div>
  );
}

export {
  Sidebar, RoleSwitcher, NotifBell, FridayWidget, TopbarClock, ToastHost,
  CrumbBar, Topbar, ToastStack, AppCtx, useApp, ROLES, buildNav,
  AdminGlobalBanners, resolveNotificationTarget, notificationOrderId,
};
