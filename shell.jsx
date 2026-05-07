// Shell — sidebar, topbar, role switcher, toast host, notifications
;(function(){
const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;
const { Icon, StatusPill, Avatar, Money, Bi, EUR, fmtDate, fmtDateTime, fmtTime, relTime, daysTo, deadlineMeta, ScoreBar } = window.EFU;

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
function buildNav(role, fixState) {
  const D = window.EF;
  if (!D) return [];
  const orders = (D.ORDERS || []).map(o => ({ ...o, ...(fixState?.[o.id] || {}) }));
  const subs = D.SUBMISSIONS || [];

  if (role === 'admin') {
    const qaPending = subs.filter(s => s.qaStatus === 'pending').length;
    const friday = orders.filter(o => o.status === 'payment_pending' && (o.outstandingEur || 0) === 0).length;
    const disputes = orders.filter(o => o.disputeOpen).length;
    return [
      { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
      { id: 'orders', label: 'Orders', icon: 'package', badge: String(orders.length) },
      { id: 'customers', label: 'Customers', icon: 'users' },
      { id: 'ghostwriters', label: 'Ghostwriters', icon: 'feather' },
      { id: 'jobs', label: 'Job Board', icon: 'clipboard-list', badge: String(orders.filter(o => o.status === 'available' && !o.gwId).length) },
      { id: 'qa', label: 'QA Queue', icon: 'shield-check', badge: qaPending ? String(qaPending) : null, badgeTone: 'warn' },
      { id: 'payments', label: 'Payments', icon: 'wallet', badge: friday ? String(friday) : null },
      { id: 'disputes', label: 'Disputes', icon: 'alert-triangle', badge: disputes ? String(disputes) : null },
      { id: 'inbox', label: 'Inbox', icon: 'inbox' },
      { id: 'offers', label: 'Offers / Sevdesk', icon: 'file-text' },
      { id: 'pipeline', label: 'Pipeline', icon: 'git-branch' },
      { id: 'bi', label: 'AI BI', icon: 'sparkles', tag: 'Beta' },
      { id: 'reports', label: 'Reports', icon: 'bar-chart-3' },
      { id: 'settings', label: 'Settings', icon: 'settings' },
    ];
  }

  if (role === 'gw') {
    const myId = 'gw-iw';
    const board = orders.filter(o => o.status === 'available' && !o.gwId).length;
    const mine = orders.filter(o => o.gwId === myId && !['completed','cancelled'].includes(o.status));
    return [
      { id: 'gw-dashboard', label: 'My Dashboard', icon: 'layout-dashboard' },
      { id: 'gw-jobs', label: 'Job Board', icon: 'clipboard-list', badge: board ? String(board) : null },
      { id: 'gw-assignments', label: 'My Assignments', icon: 'briefcase', badge: mine.length ? String(mine.length) : null },
      { id: 'gw-submissions', label: 'Submissions', icon: 'upload-cloud' },
      { id: 'gw-templates', label: 'Templates', icon: 'folder' },
      { id: 'gw-payments', label: 'Payments', icon: 'wallet' },
      { id: 'gw-messages', label: 'Messages', icon: 'message-square' },
      { id: 'gw-profile', label: 'Profile', icon: 'user' },
    ];
  }

  if (role === 'customer') {
    return [
      { id: 'cust-orders', label: 'My Orders', icon: 'package' },
      { id: 'cust-messages', label: 'Messages', icon: 'message-square' },
      { id: 'cust-invoices', label: 'Invoices', icon: 'file-text' },
      { id: 'cust-downloads', label: 'Downloads', icon: 'download' },
      { id: 'cust-profile', label: 'Profile', icon: 'user' },
    ];
  }

  if (role === 'qa') {
    const pend = subs.filter(s => s.qaStatus === 'pending').length;
    const ai = subs.filter(s => s.aiScore >= 70).length;
    return [
      { id: 'qa-queue', label: 'Review Queue', icon: 'shield-check', badge: pend ? String(pend) : null, badgeTone: 'warn' },
      { id: 'qa-plagiarism', label: 'Plagiarism Reports', icon: 'search' },
      { id: 'qa-ai', label: 'AI Detection', icon: 'bot', badge: ai ? String(ai) : null, badgeTone: 'danger' },
      { id: 'qa-history', label: 'QA History', icon: 'history' },
    ];
  }

  return [];
}

function Sidebar({ role, route, navigate, collapsed, setCollapsed, fixState }) {
  const nav = buildNav(role, fixState);
  const roleMeta = ROLES.find(r => r.id === role) || ROLES[0];
  // Map nav item ids to internal route names
  const routeMap = {
    dashboard: 'admin-dashboard', orders: 'orders', jobs: 'gw-job-board',
    qa: 'qa', payments: 'friday-batch', inbox: 'inbox', bi: 'ai-bi',
    ghostwriters: 'ghostwriters', pipeline: 'pipeline', offers: 'offers',
    customers: 'customers', disputes: 'disputes', reports: 'reports', settings: 'settings',
    'gw-dashboard': 'gw-dashboard', 'gw-jobs': 'gw-job-board',
    'gw-assignments': 'gw-active', 'gw-submissions': 'gw-submissions-list',
    'gw-templates': 'gw-templates', 'gw-payments': 'gw-payments',
    'gw-messages': 'gw-messages', 'gw-profile': 'gw-profile',
    'qa-queue': 'qa-queue', 'qa-plagiarism': 'qa-plagiarism',
    'qa-ai': 'qa-ai', 'qa-history': 'qa-history',
  };
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

function NotifBell({ notifications, onMark }) {
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
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="icon-btn" onClick={() => setOpen(!open)} aria-label={`Notifications (${unread} unread)`}>
        <span className={shake ? 'ef-bell-shake' : ''} style={{ display: 'inline-flex' }}>
          <Icon name="bell" size={16} />
        </span>
        {unread > 0 && <span className="dot-badge" />}
      </button>
      {open && (
        <div className="notif-pop">
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 13 }}>Notifications</strong>
            <button className="btn btn-ghost btn-sm" onClick={onMark}>Mark all read</button>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {notifications.map(n => (
              <div key={n.id} className={`notif-item ${n.read ? 'read' : ''} ${n.urgent ? 'urgent' : ''}`}>
                <div className="notif-dot" />
                <div style={{ flex: 1 }}>
                  <div className="notif-title">{n.title}</div>
                  <div className="notif-body">{n.body}</div>
                  <div className="notif-time">{relTime(n.at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FridayWidget({ onClick }) {
  // Derive counts from current data + applied fixState so the widget never lies.
  const k = window.EF?.KPI || { fridayCount: 0, fridayEur: 0 };
  return (
    <button type="button" className="friday-widget" onClick={onClick} title="Open Friday batch">
      <span className="friday-dot" />
      <span className="text-strong">Friday batch in 1 day</span>
      <span className="text-faint" style={{ fontFamily: 'JetBrains Mono, monospace' }}>· {k.fridayCount} releasable · {window.EFU ? window.EFU.EUR(k.fridayEur) : ('€' + k.fridayEur.toLocaleString('de-DE'))}</span>
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
  if (dismissed) return null;
  const subs = window.EF?.KPI?.pipedriveSubs || '4,159 / 5,000';
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
  const isStaff = role === 'admin' || role === 'qa';
  // Notifications scoped per role — admin sees ops alerts; others see role-relevant items
  const notifsByRole = {
    admin: [
      { id: 'n1', title: '🚨 AI violation flagged', body: 'Order #3517 — GW Anna König — 87% AI score', at: '2026-05-07T09:02:00', urgent: true, read: false },
      { id: 'n2', title: 'New claim awaiting approval', body: 'GW Maja Petrović claimed #3526', at: '2026-05-07T11:14:00', read: false },
      { id: 'n3', title: 'Customer message tagged', body: 'Pricing keyword auto-redirected · #3499', at: '2026-05-07T09:55:00', read: false },
      { id: 'n4', title: 'Friday batch ready', body: 'Releasable count derived from data', at: '2026-05-07T08:00:00', read: true },
    ],
    qa: [
      { id: 'qn1', title: 'New submission · #3530', body: 'Felix Becker · final work · pending', at: '2026-05-07T09:14:00', urgent: false, read: false },
      { id: 'qn2', title: 'AI flag · #3517', body: 'Score 87% — verdict required', at: '2026-05-07T08:42:00', urgent: true, read: false },
    ],
    gw: [
      { id: 'gn1', title: 'Claim approved · #3526', body: 'Briefing email sent', at: '2026-05-07T11:14:00', read: false },
      { id: 'gn2', title: 'Interim deadline tomorrow', body: '#3508 · Zwischenstand 1 · 18:00', at: '2026-05-07T09:00:00', read: false },
    ],
    customer: [
      { id: 'cn1', title: 'Zwischenstand verfügbar', body: 'Auftrag #3508 — Kapitel 1 freigegeben', at: '2026-05-06T16:30:00', read: false },
      { id: 'cn2', title: 'Rechnung bereit', body: 'RG-2026-3508 zum Download verfügbar', at: '2026-05-06T18:00:00', read: true },
    ],
  };
  const [notifs, setNotifs] = useState(notifsByRole[role] || notifsByRole.admin);
  // When role changes, reset the notification list to that role's set
  useEffect(() => { setNotifs(notifsByRole[role] || notifsByRole.admin); }, [role]);
  // Listen for state-mutation-driven notifications
  // Dispatch from anywhere with: window.dispatchEvent(new CustomEvent('efactory:notify', { detail: { to: 'admin', title, body, urgent } }))
  useEffect(() => {
    const handler = (e) => {
      const n = e.detail || {};
      const target = Array.isArray(n.to) ? n.to : [n.to || 'admin'];
      if (!target.includes(role)) return;
      const note = {
        id: 'live-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        title: n.title || 'Notification',
        body: n.body || '',
        at: n.at || new Date().toISOString(),
        urgent: !!n.urgent,
        read: false,
      };
      setNotifs(prev => [note, ...prev].slice(0, 12));
    };
    window.addEventListener('efactory:notify', handler);
    return () => window.removeEventListener('efactory:notify', handler);
  }, [role]);
  return (
    <div className="topbar">
      {isStaff && (
        <div className="topbar-search">
          <Icon name="search" size={14} className="text-faint"/>
          <input placeholder={isAdmin ? 'Search orders, customers, GWs… or ask AI' : 'Search submissions, orders…'} aria-label="Search"/>
          <span className="kbd">⌘K</span>
        </div>
      )}
      <div style={{ flex: 1 }}/>
      {isAdmin && <FridayWidget onClick={() => navigate('friday-batch')}/>}
      <NotifBell notifications={notifs} onMark={() => setNotifs(notifs.map(n => ({...n, read: true})))}/>
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
          <span style={{ flex: 1 }}>{t.text}</span>
          <Icon name="x" size={12} className="text-faint"/>
        </div>
      ))}
    </div>
  );
}

// Helper: anywhere in the app, push a real-time notification:
//   window.efNotify({ to: 'admin' | 'gw' | 'qa' | 'customer' | [array], title, body, urgent })
window.efNotify = function(payload) {
  try { window.dispatchEvent(new CustomEvent('efactory:notify', { detail: payload || {} })); } catch (e) {}
};

window.EFShell = { Sidebar, RoleSwitcher, NotifBell, FridayWidget, ToastHost, CrumbBar, Topbar, ToastStack, AppCtx, useApp, ROLES, buildNav, AdminGlobalBanners };
Object.assign(window, { Sidebar, Topbar, ToastStack, CrumbBar, RoleSwitcher, NotifBell, FridayWidget, AdminGlobalBanners });
})();
