// Shared utilities + design system primitives.
//
// DESIGN SYSTEM:
//   Colors live as CSS variables in styles.css (`:root` and `[data-theme="dark"]`).
//   Status semantics:  blue=in-progress · yellow=pending · green=done · red=violation/error · orange=overdue · gray=on-hold
//   Components exported: Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady,
//                        PlannedTag, EmptyState, Skeleton, ChatNotice, ChatMessage,
//                        ChatComposer, ChatThreadRow, InboxThreadRow.
//   Toasts:   import { showToast } from './src/core/toast.js'
//   Notify:   import EFActions and call EFActions.notify({to, title, body, urgent})
//   Feature flags live in data.js — single source of truth for "what's planned vs. live".
import React from 'react';
import { STATUS_PILLS, featureStatus } from './data.js';
import { showToast } from './src/core/toast.js';
import {
  emailDisplayForMessage,
  SUPPORT_INBOX,
} from './src/core/external-message-threading.js';
import { QuotedReplyBlock } from './src/components/QuotedReplyBlock.jsx';

const WORK_TYPE_TONES = {
  hausarbeit: 'blue',
  seminararbeit: 'blue',
  bachelorarbeit: 'purple',
  masterarbeit: 'amber',
  doktorarbeit: 'red',
  lektorat: 'green',
  expose: 'orange',
  coaching: 'yellow',
  sonstiges: 'slate',
};

const EUR = (n) => {
  if (n == null || isNaN(n)) return '—';
  return '€' + Number(n).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
};
const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return fmtDate(iso) + ', ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
};
const fmtTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
};
const now = () => new Date();
const useNow = (intervalMs = 1000) => {
  const [value, setValue] = React.useState(() => now());
  React.useEffect(() => {
    const tick = () => setValue(now());
    const id = window.setInterval(tick, intervalMs);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);
  return value;
};
const fmtClock = (date = now()) => {
  const d = new Date(date);
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
const fmtWeekdayDate = (date = now()) => {
  const d = new Date(date);
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
};
const greetingFor = (date = now()) => {
  const h = new Date(date).getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Good night';
};
const fridayBatchLabel = (date = now()) => {
  const day = new Date(date).getDay();
  const days = (5 - day + 7) % 7;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return 'in ' + days + ' days';
};

// Compact timestamp for admin inbox thread rows (Figma: "5:34 pm").
const fmtInboxTime = (iso, base = now()) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (d.toDateString() === base.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  }
  const days = Math.floor((base - d) / 86400000);
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return fmtDate(iso);
};

const relTime = (iso, base = now()) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = (base - d) / 1000;
  const abs = Math.abs(diff);
  if (diff < 0) {
    if (abs < 60) return 'in ' + Math.round(abs) + 's';
    if (abs < 3600) return 'in ' + Math.round(abs/60) + ' min';
    if (abs < 86400) return 'in ' + Math.round(abs/3600) + 'h';
    const futureDays = Math.round(abs/86400);
    if (futureDays < 7) return 'in ' + futureDays + ' days';
    return fmtDate(iso);
  }
  if (diff < 60) return Math.round(diff) + 's ago';
  if (diff < 3600) return Math.round(diff/60) + ' min ago';
  if (diff < 86400) {
    const h = Math.round(diff/3600);
    return h + 'h ago';
  }
  const days = Math.round(diff/86400);
  if (days === 1) return 'Yesterday ' + fmtTime(iso);
  if (days < 7) return days + ' days ago';
  return fmtDate(iso);
};

const daysTo = (iso, base = now()) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Math.ceil((d - base) / 86400000);
};

const deadlineMeta = (iso) => {
  const d = daysTo(iso);
  if (d == null) return { label: '—', tone: 'neutral' };
  if (d < 0) return { label: 'Overdue ' + Math.abs(d) + 'd', tone: 'danger' };
  if (d === 0) return { label: 'Today 18:00', tone: 'danger' };
  if (d === 1) return { label: 'D-1 · upload by 18:00 today', tone: 'danger' };
  if (d === 2) return { label: 'D-2', tone: 'warn' };
  if (d <= 7) return { label: 'in ' + d + ' days', tone: 'warn-soft' };
  return { label: 'in ' + d + ' days', tone: 'neutral' };
};

// Icons (lucide-style strokes)
const Icon = ({ name, size = 16, className = '', strokeWidth = 1.5 }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', className };
  const paths = {
    'layout-dashboard': <><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></>,
    'package': <><path d="m7.5 4.27 9 5.15"/><path d="M21 8 12 13 3 8"/><path d="M3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8z"/><path d="M12 22V13"/></>,
    'users': <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
    'feather': <><path d="M20 4 9 15l-1 4 4-1 11-11Z"/><path d="M14 4 4 14l-1 4 4-1 10-10Z" opacity="0"/><path d="M16 8 2 22"/><path d="M17.5 15H9"/></>,
    'clipboard-list': <><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></>,
    'shield-check': <><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><path d="m9 12 2 2 4-4"/></>,
    'wallet': <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></>,
    'alert-triangle': <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>,
    'inbox': <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></>,
    'file-text': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></>,
    'git-branch': <><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></>,
    'sparkles': <><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M19 17v4"/><path d="M17 19h4"/></>,
    'bar-chart-3': <><path d="M3 3v18h18"/><path d="M7 16v-5"/><path d="M11 16V8"/><path d="M15 16v-3"/><path d="M19 16V5"/></>,
    'settings': <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2"/><circle cx="12" cy="12" r="3"/></>,
    'briefcase': <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></>,
    'upload-cloud': <><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></>,
    'folder': <><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></>,
    'message-square': <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
    'user': <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    'download': <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    'history': <><path d="M3 12a9 9 0 1 0 9-9 9.74 9.74 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></>,
    'search': <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    'info': <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
    'bot': <><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></>,
    'bell': <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
    'check': <polyline points="20 6 9 17 4 12"/>,
    'check-circle': <><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></>,
    'x': <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    'x-circle': <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>,
    'plus': <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    'chevron-down': <polyline points="6 9 12 15 18 9"/>,
    'chevron-right': <polyline points="9 6 15 12 9 18"/>,
    'chevron-left': <polyline points="15 6 9 12 15 18"/>,
    'arrow-right': <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    'mail': <><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 5L2 7"/></>,
    'phone': <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>,
    'message-circle': <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>,
    'mic': <><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="22"/></>,
    'paperclip': <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 17.93 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>,
    'send': <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
    'reply': <><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></>,
    'at-sign': <><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"/></>,
    'smile': <><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></>,
    'maximize-2': <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>,
    'eye': <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    'lock': <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    'circle': <circle cx="12" cy="12" r="10"/>,
    'dot': <circle cx="12" cy="12" r="3" fill="currentColor"/>,
    'menu': <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    'panel-left': <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></>,
    'sun': <><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></>,
    'moon': <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
    'euro': <><path d="M4 10h12"/><path d="M4 14h9"/><path d="M19 6a7.7 7.7 0 0 0-5.2-2A7.9 7.9 0 0 0 6 12c0 4.4 3.5 8 7.8 8 2 0 3.8-.8 5.2-2"/></>,
    'filter': <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>,
    'more-horizontal': <><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></>,
    'corner-down-right': <><polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/></>,
    'flag': <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>,
    'pause': <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>,
    'play': <polygon points="5 3 19 12 5 21 5 3"/>,
    'rotate-ccw': <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></>,
    'zap': <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    'percent': <><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></>,
    'globe': <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>,
    'tag': <><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
    'calendar': <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    'clock': <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    'flame': <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>,
    'shield': <path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/>,
    'archive': <><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><line x1="10" y1="12" x2="14" y2="12"/></>,
    'edit': <><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></>,
    'trash': <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    'external-link': <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
    'command': <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>,
    'arrow-up-right': <><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></>,
    'arrow-down-right': <><line x1="7" y1="7" x2="17" y2="17"/><polyline points="17 7 17 17 7 17"/></>,
    'minus': <line x1="5" y1="12" x2="19" y2="12"/>,
  };
  const iconKey = paths[name] ? name : 'dot';
  return <svg {...props}><g key={iconKey}>{paths[name] || paths['dot']}</g></svg>;
};

// Status pill. When `order` is passed and the order is in `available` but
// hasn't been published to the board (jobBoardStatus !== 'open'), render the
// distinct "Paid · Ready for Job Board" variant. Callers that only have a
// raw status string keep the legacy behavior.
const StatusPill = ({ status, order }) => {
  let key = status;
  if (order && status === 'available' && order.jobBoardStatus !== 'open') {
    key = 'available_ready';
  }
  const m = STATUS_PILLS[key] || { color: 'slate', label: key };
  return <span className={`pill pill-${m.color}`}>{m.label}</span>;
};

// Avatar
const Avatar = ({ initials, size = 24, tone = 'neutral' }) => (
  <div className={`avatar avatar-${tone}`} style={{ width: size, height: size, fontSize: size * 0.42 }}>
    {initials}
  </div>
);

// Money cell
const Money = ({ amount, muted, strong }) => (
  <span className={`mono ${muted ? 'text-muted' : ''} ${strong ? 'strong' : ''}`}>{EUR(amount)}</span>
);

// Bilingual label
const Bi = ({ de, en }) => <span><span>{de}</span><span className="bi-en"> / {en}</span></span>;

// "Planned" inline tag — for use next to feature labels, card heads, nav items.
const PlannedTag = ({ status = 'planned' }) => {
  const map = {
    planned: { label: 'Planned', cls: 'tag-planned' },
    beta:    { label: 'Beta',    cls: 'tag-beta' },
  };
  const m = map[status] || map.planned;
  return <span className={m.cls}><Icon name="lock" size={9}/>{m.label}</span>;
};

// NotReady — drop-in replacement for the prior `disabled title="Coming soon"` pattern.
// Renders an aria-disabled button styled like a normal `.btn` plus an `is-not-ready` modifier
// (dashed border, lock dot, cursor: not-allowed). Click fires a toast instead of navigating.
// Props mirror a normal button; pass children just like the original.
//   <NotReady className="btn btn-sm" feature="export-csv">
//     <Icon name="download" size={12}/> Export CSV
//   </NotReady>
const NotReady = ({ children, className = 'btn', feature, label, tooltip, ariaLabel, style }) => {
  const flag = feature ? featureStatus(feature) : null;
  const effectiveLabel = label || flag?.label || (typeof children === 'string' ? children : 'This feature');
  const status = flag?.status === 'beta' ? 'beta' : 'planned';
  const title = tooltip || (status === 'beta'
    ? `Beta · ${effectiveLabel}`
    : `Planned · ${effectiveLabel}${flag?.note ? ' — ' + flag.note : ''}`);
  const onClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    showToast({
      tone: 'info',
      text: status === 'beta'
        ? `${effectiveLabel} is in beta — not yet wired in this prototype.`
        : `${effectiveLabel} — planned for a future release.`,
    });
  };
  return (
    <button
      type="button"
      aria-disabled="true"
      aria-label={ariaLabel}
      data-feature={feature || undefined}
      data-feature-status={status}
      className={`${className} is-not-ready`}
      title={title}
      style={style}
      onClick={onClick}
    >
      {children}
      <span className="not-ready-dot" aria-hidden="true">
        <Icon name="lock" size={9}/>
      </span>
    </button>
  );
};

// EmptyState — for tables/lists with no data, search-no-match, or feature-empty cases.
const EmptyState = ({ icon = 'inbox', title = 'Nothing here yet', body, actionLabel, onAction, compact }) => (
  <div className={`empty-state ${compact ? 'empty-state-compact' : ''}`}>
    <div className="empty-state-icon"><Icon name={icon} size={compact ? 18 : 24}/></div>
    <div className="empty-state-title">{title}</div>
    {body && <div className="empty-state-body">{body}</div>}
    {actionLabel && onAction && (
      <button type="button" className="btn btn-sm" onClick={onAction} style={{ marginTop: 8 }}>
        {actionLabel}
      </button>
    )}
  </div>
);

// Skeleton — placeholder for loading rows / cards. Shimmer driven by CSS.
const Skeleton = ({ w = '100%', h = 12, radius = 4, style }) => (
  <span className="skeleton" style={{ width: w, height: h, borderRadius: radius, ...style }} aria-hidden="true"/>
);

const ChatNotice = ({ tone = 'info', icon = 'lock', children, compact }) => (
  <div className={`chat-notice chat-notice-${tone} ${compact ? 'chat-notice-compact' : ''}`}>
    {icon && <Icon name={icon} size={compact ? 11 : 13}/>}
    <span>{children}</span>
  </div>
);

const ChatMessage = ({
  mine,
  system,
  sender,
  initials,
  tone = 'blue',
  contactType,
  at,
  children,
  attachments,
  channel,
  status,
  grouped,
  onReply,
  replyDisabled,
  quotedBlock,
  threadHint,
}) => {
  // Callers commonly pass `attachments={msg.attachments}` where the field is
  // explicitly null — coerce so the default only needs to cover `undefined`.
  const atts = attachments || [];
  if (system) {
    return (
      <div className="chat-system">
        <span>{children}</span>
        {at && <small>{fmtDateTime(at)}</small>}
      </div>
    );
  }
  return (
    <div className={`chat-row ${mine ? 'is-mine' : 'is-theirs'} ${grouped ? 'is-grouped' : ''}`}>
      {!mine && !grouped && <Avatar initials={initials || 'EF'} size={30} tone={tone}/>}
      {!mine && grouped && <span className="chat-avatar-spacer"/>}
      <div className="chat-bubble-wrap">
        {!grouped && (
          <div className="chat-name">
            <span className="chat-name-label">
              {mine ? 'Sie' : sender}
              {!mine && <RegisteredContactBadge contactType={contactType} size={12}/>}
            </span>
            {channel && <span className="chat-channel">{channel}</span>}
          </div>
        )}
        {threadHint && (
          <div className="chat-thread-hint">
            <span className="chat-thread-hint-label">{threadHint.label}</span>
            <strong>{threadHint.emphasis}</strong>
            {threadHint.preview && <span className="chat-thread-hint-preview">— {threadHint.preview}</span>}
          </div>
        )}
        <div className="chat-bubble">
          {quotedBlock}
          <div className="chat-bubble-text" style={{ whiteSpace: 'pre-wrap' }}>{children}</div>
          {atts.length > 0 && (
            <div className="chat-attachments">
              {atts.map((a, i) => (
                <div key={i} className="chat-attachment">
                  <Icon name={a.icon || 'paperclip'} size={12}/>
                  <span>{a.name}</span>
                  {a.meta && <small>{a.meta}</small>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="chat-meta">
          {at && <span>{fmtDateTime(at)}</span>}
          {status && <span>{status}</span>}
          {onReply && !replyDisabled && (
            <button type="button" className="chat-reply-btn" onClick={onReply} aria-label="Reply to message">
              <Icon name="corner-up-left" size={12}/> Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// EmailCard — Front-style email message: From / To from stored participants (never reply-target).
const EmailCard = ({
  message,
  contactInitials = '?',
  contactTone = 'slate',
  contactType,
  onReply,
  onOpenOrder,
  openOrderLabel = 'Open order chat',
}) => {
  const cc = Array.isArray(message.cc) ? message.cc : (message.cc ? [message.cc] : []);
  const bcc = Array.isArray(message.bcc) ? message.bcc : (message.bcc ? [message.bcc] : []);
  const attachments = message.attachments || [];
  const { direction, fromLine, to } = emailDisplayForMessage(message);
  const outbound = direction === 'outbound';
  const systemNotification = message?.source === 'order_chat_mention' || message?.from?.role === 'system';
  const cardInitials = systemNotification ? 'SU' : (outbound ? 'BÖ' : contactInitials);
  const cardTone = systemNotification ? 'slate' : (outbound ? 'blue' : contactTone);
  return (
    <div className={`email-card email-card-${direction}`}>
      <div className="email-card-head">
        <Avatar initials={cardInitials} size={34} tone={cardTone}/>
        <div className="email-card-addressing">
          <div className="email-card-from">
            <span className="email-card-from-line">{fromLine}</span>
            {!outbound && !systemNotification && contactType && (
              <RegisteredContactBadge contactType={contactType} size={13}/>
            )}
          </div>
          {to.length > 0 && <div className="email-card-to">To: {to.join(', ')}</div>}
          {cc.length > 0 && <div className="email-card-recipients">Cc: {cc.join(', ')}</div>}
          {bcc.length > 0 && <div className="email-card-recipients">Bcc: {bcc.join(', ')}</div>}
        </div>
        <div className="email-card-head-actions">
          {message.at && <span className="email-card-when">{relTime(message.at)}</span>}
          {attachments.length > 0 && (
            <span className="email-card-attach-count" title={`${attachments.length} attachment(s)`}>
              <Icon name="paperclip" size={11}/> {attachments.length}
            </span>
          )}
          {onReply && (
            <button type="button" className="email-card-head-reply" onClick={onReply} aria-label="Reply">
              <Icon name="reply" size={14}/>
            </button>
          )}
        </div>
      </div>
      <div className="email-card-body">
        <div className="email-card-body-text">{message.body}</div>
        {onOpenOrder && (
          <div className="email-card-order-cta">
            <button type="button" className="btn btn-sm btn-blue" onClick={onOpenOrder}>
              <Icon name="external-link" size={12}/> {openOrderLabel}
            </button>
          </div>
        )}
        {message.quotedMessageSnapshot && (
          <QuotedReplyBlock
            currentMessageFrom={message.from}
            quotedMessageSnapshot={message.quotedMessageSnapshot}
          />
        )}
        {attachments.length > 0 && (
          <div className="email-card-attachments">
            {attachments.map((a, i) => (
              <div key={i} className="email-card-attachment">
                <Icon name={a.icon || 'paperclip'} size={12}/>
                <span>{a.name}</span>
                {a.meta && <small>{a.meta}</small>}
              </div>
            ))}
          </div>
        )}
      </div>
      {onReply && (
        <div className="email-card-footer">
          <button type="button" className="btn btn-sm" onClick={onReply}>
            <Icon name="reply" size={12}/> Reply
          </button>
        </div>
      )}
    </div>
  );
};

// MediumChip — small visual tag indicating an external transport medium
// (email / WhatsApp / voice). Pure presentational, no model coupling.
const MediumChip = ({ medium }) => {
  if (!medium || medium === 'platform') return null;
  const label = medium === 'email' ? 'Email' : medium === 'whatsapp' ? 'WhatsApp' : medium === 'voice' ? 'Voice' : medium;
  const icon = medium === 'email' ? 'mail' : medium === 'whatsapp' ? 'message-circle' : 'phone';
  return (
    <span className={`medium-chip medium-chip-${medium}`}>
      <Icon name={icon} size={10}/> {label}
    </span>
  );
};

// EmailReplyComposer — Front-style reply box (From/To, body, AI draft, Send).
const EmailReplyComposer = ({
  fromEmail = 'berat@efactory1.de',
  toName,
  toEmail,
  subject,
  quotedMessageSnapshot = null,
  composerFrom = SUPPORT_INBOX,
  value,
  onChange,
  onSend,
  onDiscard,
  generateDraft,
  placeholder = 'Type your reply…',
  sendLabel = 'Send',
  disabled,
}) => {
  const [undoVisible, setUndoVisible] = React.useState(false);
  const undoBodyRef = React.useRef('');
  const undoTimerRef = React.useRef(null);

  React.useEffect(() => () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, []);

  const handleGenerate = () => {
    const draft = typeof generateDraft === 'function' ? generateDraft() : '';
    if (!draft) return;
    undoBodyRef.current = value || '';
    onChange({ target: { value: draft } });
    setUndoVisible(true);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => setUndoVisible(false), 5000);
  };

  const handleUndo = () => {
    onChange({ target: { value: undoBodyRef.current } });
    setUndoVisible(false);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  };

  const toLabel = toEmail ? `${toName} <${toEmail}>` : toName;

  return (
    <div className="email-reply-composer">
      <div className="email-reply-addressing">
        <div className="email-reply-row">
          <span className="email-reply-label">From:</span>
          <span className="email-reply-pill email-reply-pill-from">{fromEmail}</span>
        </div>
        <div className="email-reply-row email-reply-row-to">
          <span className="email-reply-label">To:</span>
          <span className="email-reply-pill">{toName}</span>
          <span className="email-reply-row-meta">
            <span className="email-reply-link is-muted">Cc</span>
            <span className="email-reply-link is-muted">Bcc</span>
            {subject && <span className="email-reply-subject" title={subject}>Subject: {subject}</span>}
          </span>
        </div>
        {toEmail && <div className="email-reply-to-detail">{toLabel}</div>}
      </div>
      <div className="email-reply-editor">
        {undoVisible && (
          <button type="button" className="email-reply-undo" onClick={handleUndo}>Undo</button>
        )}
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Reply body"
          rows={5}
        />
        {quotedMessageSnapshot && (
          <QuotedReplyBlock
            mode="composer"
            currentMessageFrom={composerFrom}
            quotedMessageSnapshot={quotedMessageSnapshot}
          />
        )}
      </div>
      <div className="email-reply-footer">
        <div className="email-reply-tools">
          <button
            type="button"
            className="email-reply-ai"
            onClick={handleGenerate}
            disabled={disabled}
            aria-label="Generate reply with AI"
            title="Generate reply"
          >
            <Icon name="sparkles" size={16}/>
          </button>
        </div>
        <div className="email-reply-send-row">
          {onDiscard && (
            <button type="button" className="btn btn-sm" onClick={onDiscard} aria-label="Discard reply">
              <Icon name="x" size={14}/>
            </button>
          )}
          <button
            type="button"
            className="btn btn-sm btn-blue"
            onClick={onSend}
            disabled={disabled || !String(value || '').trim()}
          >
            <Icon name="send" size={13}/> {sendLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

function renderBodyWithMentions(body, mentionables = []) {
  if (!body) return null;
  const names = mentionables.map(t => (t.mentionKey || t.name.split(/\s+/)[0]));
  if (!names.length) return body;
  const re = new RegExp(`@(${names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
  const parts = [];
  let last = 0;
  let match;
  while ((match = re.exec(body)) !== null) {
    if (match.index > last) parts.push(body.slice(last, match.index));
    parts.push(<strong key={match.index} className="chat-mention">{match[0]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < body.length) parts.push(body.slice(last));
  return parts.length ? parts : body;
}

function renderNoteBodyWithMentions(body, teammates = []) {
  return renderBodyWithMentions(body, teammates);
}

const InternalCommentNote = ({ note, teammates, inStream = false }) => (
  <div className={`inbox-internal-note ${inStream ? 'inbox-internal-note--stream' : ''}`}>
    <Avatar initials={note.authorInitials || 'EF'} size={26} tone="slate"/>
    <div className="inbox-internal-note-main">
      <div className="inbox-internal-note-meta">
        <strong>{note.authorName}</strong>
        <span className="inbox-internal-note-time">{relTime(note.at)}</span>
        <span className="inbox-internal-note-badge">Internal</span>
      </div>
      <div className="inbox-internal-note-body">{renderNoteBodyWithMentions(note.body, teammates)}</div>
    </div>
  </div>
);

const InternalCommentBar = ({
  teamName = 'eFactory Support',
  teammates = [],
  value,
  onChange,
  onSubmit,
}) => {
  const inputRef = React.useRef(null);
  const [expanded, setExpanded] = React.useState(false);
  const [mentionOpen, setMentionOpen] = React.useState(false);
  const [mentionQ, setMentionQ] = React.useState('');

  const filteredMentions = teammates.filter(t => {
    if (!mentionQ) return true;
    const q = mentionQ.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
  });

  const syncMentionMenu = (el) => {
    if (!el) return;
    const pos = el.selectionStart ?? 0;
    const before = (el.value || '').slice(0, pos);
    const m = before.match(/@([\w.]*)$/);
    if (m) {
      setMentionOpen(true);
      setMentionQ(m[1].toLowerCase());
    } else {
      setMentionOpen(false);
      setMentionQ('');
    }
  };

  const insertMention = (person) => {
    const el = inputRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? value.length;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const first = person.name.split(/\s+/)[0];
    const next = `${before.replace(/@([\w.]*)$/, `@${first} `)}${after}`;
    onChange({ target: { value: next } });
    setMentionOpen(false);
    setMentionQ('');
    requestAnimationFrame(() => {
      el.focus();
      const caret = before.replace(/@([\w.]*)$/, `@${first} `).length;
      el.setSelectionRange(caret, caret);
    });
  };

  const insertAtTrigger = () => {
    const el = inputRef.current;
    const next = value ? `${value}${value.endsWith(' ') ? '' : ' '}@` : '@';
    onChange({ target: { value: next } });
    requestAnimationFrame(() => {
      el?.focus();
      syncMentionMenu(el);
    });
  };

  const handleKeyDown = (e) => {
    if (mentionOpen && filteredMentions.length) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        insertMention(filteredMentions[0]);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && !expanded) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="inbox-internal-bar-wrap">
      {mentionOpen && filteredMentions.length > 0 && (
        <ul className="inbox-internal-mention-menu" role="listbox">
          {filteredMentions.map(t => (
            <li key={t.id}>
              <button type="button" role="option" onMouseDown={(e) => { e.preventDefault(); insertMention(t); }}>
                <Avatar initials={t.initials} size={22} tone="slate"/>
                <span>{t.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={`inbox-internal-bar ${expanded ? 'is-expanded' : ''}`}>
        <textarea
          ref={inputRef}
          className="inbox-internal-input"
          rows={expanded ? 4 : 1}
          placeholder={`Add internal comment visible to teammates in ${teamName}`}
          value={value}
          onChange={(e) => { onChange(e); syncMentionMenu(e.target); }}
          onKeyDown={handleKeyDown}
          onClick={(e) => syncMentionMenu(e.target)}
          aria-label="Internal comment"
        />
        <div className="inbox-internal-actions">
          <button type="button" className="inbox-internal-icon is-muted" disabled aria-label="Attach file" tabIndex={-1}>
            <Icon name="paperclip" size={14}/>
          </button>
          <button type="button" className="inbox-internal-icon" onClick={insertAtTrigger} aria-label="Mention teammate">
            <Icon name="at-sign" size={14}/>
          </button>
          <button type="button" className="inbox-internal-icon is-muted" disabled aria-label="Emoji" tabIndex={-1}>
            <Icon name="smile" size={14}/>
          </button>
          <span className="inbox-internal-gif is-muted" aria-hidden="true">GIF</span>
          <button
            type="button"
            className="inbox-internal-icon"
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <Icon name="maximize-2" size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatComposer = ({
  value,
  onChange,
  onSend,
  placeholder,
  disabled,
  helper,
  actions,
  sendLabel = 'Senden',
  mentionables = [],
  replyBanner,
  quotedBlock,
  onCancelReply,
  inputRef: inputRefProp,
}) => {
  const localRef = React.useRef(null);
  const inputRef = inputRefProp || localRef;
  const [mentionOpen, setMentionOpen] = React.useState(false);
  const [mentionQ, setMentionQ] = React.useState('');

  const filteredMentions = mentionables.filter(t => {
    if (!mentionQ) return true;
    const q = mentionQ.toLowerCase();
    const key = (t.mentionKey || t.name.split(/\s+/)[0]).toLowerCase();
    return t.name.toLowerCase().includes(q) || key.includes(q);
  });

  const syncMentionMenu = (el) => {
    if (!el || !mentionables.length) return;
    const pos = el.selectionStart ?? 0;
    const before = (el.value || '').slice(0, pos);
    const m = before.match(/@([\w.]*)$/);
    if (m) {
      setMentionOpen(true);
      setMentionQ(m[1].toLowerCase());
    } else {
      setMentionOpen(false);
      setMentionQ('');
    }
  };

  const insertMention = (person) => {
    const el = inputRef.current;
    if (!el) return;
    const pos = el.selectionStart ?? value.length;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const key = person.mentionKey || person.name.split(/\s+/)[0];
    const next = `${before.replace(/@([\w.]*)$/, `@${key} `)}${after}`;
    onChange({ target: { value: next } });
    setMentionOpen(false);
    setMentionQ('');
    requestAnimationFrame(() => {
      el.focus();
      const caret = before.replace(/@([\w.]*)$/, `@${key} `).length;
      el.setSelectionRange(caret, caret);
    });
  };

  const insertAtTrigger = () => {
    const el = inputRef.current;
    const next = value ? `${value}${value.endsWith(' ') ? '' : ' '}@` : '@';
    onChange({ target: { value: next } });
    requestAnimationFrame(() => {
      el?.focus();
      syncMentionMenu(el);
    });
  };

  const handleKeyDown = (e) => {
    if (mentionOpen && filteredMentions.length) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        insertMention(filteredMentions[0]);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend?.();
    }
  };

  return (
    <div className="chat-composer">
      {helper}
      {replyBanner}
      {mentionOpen && filteredMentions.length > 0 && (
        <ul className="chat-mention-menu" role="listbox">
          {filteredMentions.map(t => (
            <li key={t.id}>
              <button type="button" role="option" onMouseDown={(e) => { e.preventDefault(); insertMention(t); }}>
                <Avatar initials={t.initials} size={22} tone={t.role === 'gw' ? 'amber' : t.role === 'customer' ? 'blue' : 'slate'}/>
                <span>{t.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="chat-composer-main">
        {quotedBlock && <div className="chat-composer-quote">{quotedBlock}</div>}
        <div className="chat-composer-row">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => { onChange(e); syncMentionMenu(e.target); }}
            onKeyDown={handleKeyDown}
            onClick={(e) => syncMentionMenu(e.target)}
            placeholder={placeholder}
            disabled={disabled}
            aria-label={placeholder || 'Message'}
          />
          <div className="chat-composer-actions">
            {mentionables.length > 0 && (
              <button type="button" className="chat-composer-icon" onClick={insertAtTrigger} aria-label="Mention participant" disabled={disabled}>
                <Icon name="at-sign" size={14}/>
              </button>
            )}
            {actions}
            {onCancelReply && (
              <button type="button" className="chat-composer-icon is-muted" onClick={onCancelReply} aria-label="Cancel reply">
                <Icon name="x" size={14}/>
              </button>
            )}
            <button type="button" className="chat-send" onClick={onSend} disabled={disabled || !String(value || '').trim()} aria-label={sendLabel}>
              <Icon name="send" size={15}/>
              <span>{sendLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatThreadRow = ({ active, unread, initials, tone = 'blue', title, subtitle, preview, meta, badges, onClick }) => (
  <button type="button" className={`chat-thread-row ${active ? 'is-active' : ''} ${unread ? 'has-unread' : ''}`} onClick={onClick} aria-current={active || undefined}>
    <Avatar initials={initials || 'EF'} size={38} tone={tone}/>
    <span className="chat-thread-body">
      <span className="chat-thread-top">
        <strong>{title}</strong>
        {meta && <span>{meta}</span>}
      </span>
      {subtitle && <span className="chat-thread-subtitle">{subtitle}</span>}
      <span className="chat-thread-preview">{preview}</span>
      {badges && <span className="chat-thread-badges">{badges}</span>}
    </span>
    {unread ? <span className="chat-unread-dot" aria-label={`${unread} unread`}>{unread}</span> : <Icon name="chevron-right" size={14} className="text-faint"/>}
  </button>
);

// GW Messages · active-order chat row (Figma 277:116 — id → title → sender + snippet + unread pill).
const GwOrderChatThreadRow = ({
  active,
  unread,
  initials,
  tone = 'blue',
  orderId,
  orderTitle,
  previewSender,
  previewSnippet,
  onClick,
}) => (
  <button
    type="button"
    className={`gw-order-chat-thread-row ${active ? 'is-active' : ''} ${unread ? 'has-unread' : ''}`}
    onClick={onClick}
    aria-current={active || undefined}
  >
    <Avatar initials={initials || '··'} size={38} tone={tone}/>
    <span className="gw-order-chat-thread-body">
      <span className="gw-order-chat-thread-id mono">#{orderId}</span>
      {orderTitle && (
        <span className="gw-order-chat-thread-title">{orderTitle}</span>
      )}
      {(previewSender || previewSnippet) && (
        <span className="gw-order-chat-thread-preview-row">
          <span className="gw-order-chat-thread-preview">
            {previewSender && (
              <span className="gw-order-chat-thread-sender">{previewSender}: </span>
            )}
            {previewSnippet && (
              <span className="gw-order-chat-thread-snippet">{previewSnippet}</span>
            )}
          </span>
          {unread > 0 && (
            <span className="gw-order-chat-thread-unread-pill" aria-label={`${unread} unread`}>{unread}</span>
          )}
        </span>
      )}
    </span>
  </button>
);

// Registered customer / ghostwriter indicator (leads have no badge).
const RegisteredContactBadge = ({ contactType, size = 14 }) => {
  if (contactType !== 'customer' && contactType !== 'gw') return null;
  const label = contactType === 'customer' ? 'Registered customer' : 'Registered ghostwriter';
  return (
    <span className="inbox-registered-badge" title={label} aria-label={label}>
      <Icon name="check-circle" size={size} className="inbox-registered-badge-icon" aria-hidden="true"/>
    </span>
  );
};

// InboxThreadRow — admin inbox sidebar row (Figma lead/email + lead/whats).
const InboxThreadRow = ({ active, unread, initials, tone = 'blue', medium = 'email', contactType, title, subject, preview, youReplied, meta, onClick }) => (
  <button
    type="button"
    className={`inbox-thread-row inbox-thread-row-${medium} ${active ? 'is-active' : ''} ${unread ? 'has-unread' : ''} ${youReplied ? 'has-you-replied' : ''}`}
    onClick={onClick}
    aria-current={active || undefined}
  >
    <span className="inbox-thread-avatar-wrap">
      <Avatar initials={initials || 'EF'} size={38} tone={tone}/>
      <span className={`inbox-thread-medium-badge inbox-thread-medium-badge-${medium}`} aria-hidden="true">
        <Icon name={medium === 'email' ? 'mail' : 'message-circle'} size={medium === 'email' ? 9 : 8}/>
      </span>
    </span>
    <span className="inbox-thread-body">
      <span className="inbox-thread-top">
        <span className="inbox-thread-title-wrap">
          <strong className="inbox-thread-title">{title}</strong>
          {contactType && <RegisteredContactBadge contactType={contactType}/>}
        </span>
        <span className="inbox-thread-meta">
          {meta && <span className="inbox-thread-time">{meta}</span>}
          {medium === 'email' && unread > 0 && <span className="inbox-thread-unread-dot" aria-hidden="true"/>}
        </span>
      </span>
      {medium === 'email' && subject && <span className="inbox-thread-subject">{subject}</span>}
      <span className={`inbox-thread-preview-row ${youReplied ? 'has-you-replied' : ''}`}>
        {youReplied ? (
          <>
            <span className="inbox-thread-you-replied">
              <Icon name="reply" size={14} className="inbox-thread-reply-icon" aria-hidden="true"/>
              <span>You replied:</span>
            </span>
            <span className="inbox-thread-preview-snippet">{preview}</span>
          </>
        ) : (
          <span className="inbox-thread-preview">{preview}</span>
        )}
        {medium === 'whatsapp' && unread > 0 && (
          <span className="inbox-thread-unread-pill" aria-label={`${unread} unread`}>{unread}</span>
        )}
      </span>
    </span>
  </button>
);

// Score bar (plagiarism / AI)
const ScoreBar = ({ value, label }) => {
  const tone = value < 15 ? 'green' : value < 30 ? 'amber' : 'red';
  return (
    <div className="score-bar">
      <div className="score-bar-head">
        <span className="text-muted">{label}</span>
        <span className={`mono score-val score-${tone}`}>{value}%</span>
      </div>
      <div className="score-bar-track">
        <div className={`score-bar-fill score-${tone}`} style={{ width: Math.min(100, value) + '%' }} />
      </div>
    </div>
  );
};

export {
  EUR, fmtDate, fmtDateTime, fmtTime, fmtInboxTime, now, useNow, fmtClock, fmtWeekdayDate,
  greetingFor, fridayBatchLabel, relTime, daysTo, deadlineMeta,
  Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag,
  EmptyState, Skeleton, ChatNotice, ChatMessage, EmailCard, EmailReplyComposer, InternalCommentBar, InternalCommentNote, MediumChip, ChatComposer, ChatThreadRow, GwOrderChatThreadRow, InboxThreadRow, RegisteredContactBadge, renderBodyWithMentions,
  WORK_TYPE_TONES,
};

// EFDS — design system surface: components + tokens reference.
// Tokens are CSS variables (see :root in styles.css); EFDS.tokens documents the canonical names
// so future code can read them via getComputedStyle() or simply consult this map.
export const EFDS = {
  components: { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton, ChatNotice, ChatMessage, EmailCard, EmailReplyComposer, InternalCommentBar, InternalCommentNote, MediumChip, ChatComposer, ChatThreadRow, InboxThreadRow },
  tokens: {
    color: {
      // semantics → css var name
      brand:        '--blue',
      success:      '--green',
      danger:       '--red',
      warning:      '--amber',
      // surfaces
      bg:           '--bg',
      surface:      '--surface',
      surface2:     '--surface-2',
      // text
      text:         '--text',
      text2:        '--text-2',
      text3:        '--text-3',
      // hairlines
      border:       '--border',
      borderStrong: '--border-strong',
    },
    statusToTone: {
      blue:   'in-progress',
      yellow: 'pending',
      green:  'done',
      red:    'violation',
      orange: 'overdue',
      gray:   'on-hold',
      slate:  'neutral',
    },
    space: { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, xxl: 24 },
    radius: { sm: 4, md: 6, lg: 8, pill: 999 },
    text: {
      micro: 11,    // labels, table th, captions
      small: 11.5,  // buttons, chips
      body:  12.5,  // default body text
      lead:  13.5,  // emphasized rows
      h3:    16,
      h2:    20,
      h1:    24,
    },
  },
};
