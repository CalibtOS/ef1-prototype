// Central route names, hash parsing/building, defaults, and sidebar nav metadata.
;(function(){
const ROUTES = {
  ADMIN_DASHBOARD: 'admin-dashboard',
  ORDERS: 'orders',
  ORDER_DETAIL: 'order-detail',
  ORDER_NEW: 'order-new',
  FRIDAY_BATCH: 'friday-batch',
  QA: 'qa',
  INBOX: 'inbox',
  AI_BI: 'ai-bi',
  GW_JOB_BOARD: 'gw-job-board',
  GHOSTWRITERS: 'ghostwriters',
  GHOSTWRITER_DETAIL: 'ghostwriter-detail',
  PIPELINE: 'pipeline',
  CUSTOMERS: 'customers',
  CUSTOMER_DETAIL: 'customer-detail',
  DISPUTES: 'disputes',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  OFFERS: 'offers',
  GW_DASHBOARD: 'gw-dashboard',
  GW_ACTIVE: 'gw-active',
  GW_SUBMIT: 'gw-submit',
  GW_REPORT_DELAY: 'gw-report-delay',
  GW_EXTENSION: 'gw-extension',
  GW_FIRST_CONTACT: 'gw-first-contact',
  GW_ONBOARDING: 'gw-onboarding',
  GW_SUBMISSIONS: 'gw-submissions-list',
  GW_TEMPLATES: 'gw-templates',
  GW_PAYMENTS: 'gw-payments',
  GW_MESSAGES: 'gw-messages',
  GW_PROFILE: 'gw-profile',
  GW_ASSIGNMENT_DETAIL: 'gw-assignment-detail',
  QA_QUEUE: 'qa-queue',
  QA_PLAGIARISM: 'qa-plagiarism',
  QA_AI: 'qa-ai',
  QA_HISTORY: 'qa-history',
  CUSTOMER_ORDERS: 'cust-orders',
  CUSTOMER_MESSAGES: 'cust-messages',
  CUSTOMER_INVOICES: 'cust-invoices',
  CUSTOMER_DOWNLOADS: 'cust-downloads',
  CUSTOMER_PROFILE: 'cust-profile',
};

function defaultRouteFor(role) {
  if (role === 'gw') return ROUTES.GW_DASHBOARD;
  if (role === 'qa') return ROUTES.QA_QUEUE;
  if (role === 'customer') return ROUTES.CUSTOMER_ORDERS;
  return ROUTES.ADMIN_DASHBOARD;
}

function parseHash() {
  const raw = (window.location.hash || '').replace(/^#\/?/, '');
  if (!raw) return { role: 'admin', name: ROUTES.ADMIN_DASHBOARD, params: {} };
  const [path, query] = raw.split('?');
  const segments = path.split('/').filter(Boolean);
  const role = ['admin','gw','qa','customer'].includes(segments[0]) ? segments[0] : 'admin';
  const name = segments[1] || defaultRouteFor(role);
  const params = {};
  if (query) {
    new URLSearchParams(query).forEach((v, k) => { params[k] = /^\d+$/.test(v) ? Number(v) : v; });
  }
  return { role, name, params };
}

function buildHash(role, name, params) {
  const qs = params && Object.keys(params).length
    ? '?' + new URLSearchParams(Object.entries(params).filter(([,v]) => v != null && v !== '').map(([k,v]) => [k, String(v)])).toString()
    : '';
  return `#/${role}/${name || defaultRouteFor(role)}${qs}`;
}

const NAV_ROUTE_MAP = {
  dashboard: ROUTES.ADMIN_DASHBOARD,
  orders: ROUTES.ORDERS,
  jobs: ROUTES.GW_JOB_BOARD,
  qa: ROUTES.QA,
  payments: ROUTES.FRIDAY_BATCH,
  inbox: ROUTES.INBOX,
  bi: ROUTES.AI_BI,
  ghostwriters: ROUTES.GHOSTWRITERS,
  pipeline: ROUTES.PIPELINE,
  offers: ROUTES.OFFERS,
  customers: ROUTES.CUSTOMERS,
  disputes: ROUTES.DISPUTES,
  reports: ROUTES.REPORTS,
  settings: ROUTES.SETTINGS,
  'gw-dashboard': ROUTES.GW_DASHBOARD,
  'gw-jobs': ROUTES.GW_JOB_BOARD,
  'gw-assignments': ROUTES.GW_ACTIVE,
  'gw-submissions': ROUTES.GW_SUBMISSIONS,
  'gw-templates': ROUTES.GW_TEMPLATES,
  'gw-payments': ROUTES.GW_PAYMENTS,
  'gw-messages': ROUTES.GW_MESSAGES,
  'gw-profile': ROUTES.GW_PROFILE,
  'qa-queue': ROUTES.QA_QUEUE,
  'qa-plagiarism': ROUTES.QA_PLAGIARISM,
  'qa-ai': ROUTES.QA_AI,
  'qa-history': ROUTES.QA_HISTORY,
};

function navItems(role, state) {
  const S = window.EFSelectors;
  const W = window.EFWorkflow;
  const orders = S.selectAllOrders(state);
  const submissions = S.selectAllSubmissions(state);
  if (role === 'admin') {
    const qaPending = submissions.filter(s => s.qaStatus === 'pending').length;
    const friday = orders.filter(o => W.releaseGates(o).releasable).length;
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
    const gwId = state.session.gwId;
    const board = orders.filter(o => o.status === 'available' && !o.gwId).length;
    const mine = orders.filter(o => o.gwId === gwId && !['completed','cancelled'].includes(o.status));
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
  if (role === 'qa') {
    const pend = submissions.filter(s => s.qaStatus === 'pending').length;
    const ai = submissions.filter(s => s.aiScore >= 70 || s.flagged).length;
    return [
      { id: 'qa-queue', label: 'Review Queue', icon: 'shield-check', badge: pend ? String(pend) : null, badgeTone: 'warn' },
      { id: 'qa-plagiarism', label: 'Plagiarism Reports', icon: 'search' },
      { id: 'qa-ai', label: 'AI Detection', icon: 'bot', badge: ai ? String(ai) : null, badgeTone: 'danger' },
      { id: 'qa-history', label: 'QA History', icon: 'history' },
    ];
  }
  return [
    { id: ROUTES.CUSTOMER_ORDERS, label: 'My Orders', icon: 'package' },
    { id: ROUTES.CUSTOMER_MESSAGES, label: 'Messages', icon: 'message-square' },
    { id: ROUTES.CUSTOMER_INVOICES, label: 'Invoices', icon: 'file-text' },
    { id: ROUTES.CUSTOMER_DOWNLOADS, label: 'Downloads', icon: 'download' },
    { id: ROUTES.CUSTOMER_PROFILE, label: 'Profile', icon: 'user' },
  ];
}

window.EFRoutes = { ROUTES, NAV_ROUTE_MAP, defaultRouteFor, parseHash, buildHash, navItems };
})();
