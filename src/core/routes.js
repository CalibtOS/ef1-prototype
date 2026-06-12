// Central route names, hash parsing/building, defaults, and sidebar nav metadata.
import * as S from './selectors.js';
import * as W from './workflow.js';
import { QA_STATUS } from './status.js';

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
  ADMIN_CHAT_REPORTS: 'admin-chat-reports',
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
  GW_REPORTS: 'gw-reports',
  GW_PROFILE: 'gw-profile',
  GW_ASSIGNMENT_DETAIL: 'gw-assignment-detail',
  GW_CALENDAR: 'gw-calendar',
  GW_TIMELINE: 'gw-timeline',
  GW_MEETINGS: 'gw-meetings',
  ADMIN_CALENDAR: 'admin-calendar',
  ADMIN_MEETINGS: 'admin-meetings',
  QA_QUEUE: 'qa-queue',
  QA_PLAGIARISM: 'qa-plagiarism',
  QA_AI: 'qa-ai',
  QA_HISTORY: 'qa-history',
  CUSTOMER_ORDERS: 'cust-orders',
  CUSTOMER_MESSAGES: 'cust-messages',
  CUSTOMER_INVOICES: 'cust-invoices',
  CUSTOMER_DOWNLOADS: 'cust-downloads',
  CUSTOMER_PROFILE: 'cust-profile',
  CUSTOMER_AGENDA: 'cust-agenda',
  WP_HAUSARBEIT: 'wp-hausarbeit',
  WP_VIELEN_DANK: 'wp-vielen-dank',
  SIM_STRIPE_CHECKOUT: 'sim-stripe-checkout',
};

function defaultRouteFor(role) {
  if (role === 'gw') return ROUTES.GW_DASHBOARD;
  if (role === 'qa') return ROUTES.QA_QUEUE;
  if (role === 'customer') return ROUTES.CUSTOMER_ORDERS;
  if (role === 'wp') return ROUTES.WP_HAUSARBEIT;
  if (role === 'sim') return ROUTES.SIM_STRIPE_CHECKOUT;
  return ROUTES.ADMIN_DASHBOARD;
}

function parseHash() {
  const raw = (window.location.hash || '').replace(/^#\/?/, '');
  if (!raw) return { role: 'admin', name: ROUTES.ADMIN_DASHBOARD, params: {} };
  const [path, query] = raw.split('?');
  const segments = path.split('/').filter(Boolean);
  const role = ['admin','gw','qa','customer','wp','sim'].includes(segments[0]) ? segments[0] : 'admin';
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
  'chat-reports': ROUTES.ADMIN_CHAT_REPORTS,
  settings: ROUTES.SETTINGS,
  'gw-dashboard': ROUTES.GW_DASHBOARD,
  'gw-jobs': ROUTES.GW_JOB_BOARD,
  'gw-assignments': ROUTES.GW_ACTIVE,
  'gw-submissions': ROUTES.GW_SUBMISSIONS,
  'gw-templates': ROUTES.GW_TEMPLATES,
  'gw-payments': ROUTES.GW_PAYMENTS,
  'gw-messages': ROUTES.GW_MESSAGES,
  'gw-reports': ROUTES.GW_REPORTS,
  'gw-profile': ROUTES.GW_PROFILE,
  'gw-calendar': ROUTES.GW_CALENDAR,
  'gw-timeline': ROUTES.GW_TIMELINE,
  'gw-meetings': ROUTES.GW_MEETINGS,
  'admin-calendar': ROUTES.ADMIN_CALENDAR,
  'admin-meetings': ROUTES.ADMIN_MEETINGS,
  'qa-queue': ROUTES.QA_QUEUE,
  'qa-plagiarism': ROUTES.QA_PLAGIARISM,
  'qa-ai': ROUTES.QA_AI,
  'qa-history': ROUTES.QA_HISTORY,
};

function navItems(role, state) {
  const orders = S.selectAllOrders(state);
  const submissions = S.selectAllSubmissions(state);
  if (role === 'admin') {
    const qaPending = submissions.filter(s => W.isQaReviewKind(s.kind) && s.qaStatus === QA_STATUS.PENDING).length;
    const friday = orders.filter(o => W.releaseGates(o).releasable).length;
    const disputes = orders.filter(o => W.isOrderDisputed(o)).length;
    const chatReportsPending = S.selectAllChatReports(state).filter(r => r.status === 'pending').length;
    return [
      { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
      { id: 'orders', label: 'Orders', icon: 'package', badge: String(orders.length) },
      { id: 'customers', label: 'Customers', icon: 'users' },
      { id: 'ghostwriters', label: 'Ghostwriters', icon: 'feather' },
      { id: 'jobs', label: 'Job Board', icon: 'clipboard-list', badge: String(orders.filter(o => o.status === 'available' && !o.gwId && (!o.scenarioId || o.jobBoardStatus === 'open')).length) },
      { id: 'qa', label: 'QA Queue', icon: 'shield-check', badge: qaPending ? String(qaPending) : null, badgeTone: 'warn' },
      { id: 'payments', label: 'Payments', icon: 'wallet', badge: friday ? String(friday) : null },
      { id: 'disputes', label: 'Disputes', icon: 'alert-triangle', badge: disputes ? String(disputes) : null },
      { id: 'chat-reports', label: 'Chat Reports', icon: 'flag', badge: chatReportsPending ? String(chatReportsPending) : null, badgeTone: 'danger' },
      { id: 'inbox', label: 'Inbox', icon: 'inbox' },
      { id: 'pipeline', label: 'Pipeline', icon: 'git-branch' },
      { id: 'bi', label: 'AI BI', icon: 'sparkles', tag: 'Beta' },
      { id: 'reports', label: 'Reports', icon: 'bar-chart-3' },
      { id: 'admin-meetings', label: 'Meetings', icon: 'video' },
      { id: 'settings', label: 'Settings', icon: 'settings' },
    ];
  }
  if (role === 'gw') {
    const gwId = state.session.gwId;
    const board = orders.filter(o => o.status === 'available' && !o.gwId && (!o.scenarioId || o.jobBoardStatus === 'open')).length;
    const mine = orders.filter(o => o.gwId === gwId && !['completed','cancelled'].includes(o.status));
    const myOrderIds = new Set(mine.map(o => o.id));
    const chatsTable = state.entities?.order_chats;
    let msgUnread = 0;
    if (chatsTable?.byId) {
      Object.values(chatsTable.byId).forEach(c => {
        if (myOrderIds.has(c.orderId)) msgUnread += c.unread?.gw || 0;
      });
    }
    return [
      { id: 'gw-dashboard', label: 'My Dashboard', icon: 'layout-dashboard' },
      { id: 'gw-jobs', label: 'Job Board', icon: 'clipboard-list', badge: board ? String(board) : null },
      { id: 'gw-assignments', label: 'My Assignments', icon: 'briefcase', badge: mine.length ? String(mine.length) : null },
      { id: 'gw-submissions', label: 'Submissions', icon: 'upload-cloud' },
      { id: 'gw-templates', label: 'Templates', icon: 'folder' },
      { id: 'gw-payments', label: 'Payments', icon: 'wallet' },
      { id: 'gw-messages', label: 'Messages', icon: 'message-square', badge: msgUnread ? String(msgUnread) : null },
      { id: 'gw-meetings', label: 'Meetings', icon: 'video' },
      { id: 'gw-reports', label: 'My Reports', icon: 'flag' },
      { id: 'gw-profile', label: 'Profile', icon: 'user' },
    ];
  }
  if (role === 'qa') {
    const pend = submissions.filter(s => W.isQaReviewKind(s.kind) && s.qaStatus === QA_STATUS.PENDING).length;
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

export { ROUTES, NAV_ROUTE_MAP, defaultRouteFor, parseHash, buildHash, navItems };
