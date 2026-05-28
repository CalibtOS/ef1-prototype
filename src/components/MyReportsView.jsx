// Shared read-only view of chat reports submitted by a customer or GW.
import React from 'react';
import { Icon, Avatar, EmptyState } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import EF from '../core/ef.js';

const D = EF;

const STRINGS = {
  de: {
    title: 'Meine Meldungen',
    subtitle: 'Ihre gemeldeten Chatnachrichten und der aktuelle Bearbeitungsstatus',
    emptyTitle: 'Keine Meldungen',
    emptyBody: 'Sie haben noch keine Chatnachrichten gemeldet.',
    pending: 'Ausstehend',
    reviewed: 'Überprüft',
    dismissed: 'Abgelehnt',
    reason: 'Grund',
    messages: 'Nachrichten',
    message: 'Nachricht',
    order: 'Auftrag',
    adminNote: 'Admin-Feedback',
    reportedMessages: 'Gemeldete Nachrichten',
    noMessages: 'Nachrichten konnten nicht geladen werden.',
  },
  en: {
    title: 'My Reports',
    subtitle: 'Chat reports you have submitted and their current status',
    emptyTitle: 'No reports',
    emptyBody: 'You have not reported any chat messages yet.',
    pending: 'Pending',
    reviewed: 'Reviewed',
    dismissed: 'Dismissed',
    reason: 'Reason',
    messages: 'messages',
    message: 'message',
    order: 'Order',
    adminNote: 'Admin feedback',
    reportedMessages: 'Reported messages',
    noMessages: 'Could not load the reported messages.',
  },
};

const STATUS_META = {
  pending:   { color: 'var(--amber)',  bg: 'color-mix(in oklab, var(--amber) 8%, var(--surface))',  border: 'color-mix(in oklab, var(--amber) 20%, var(--border))'  },
  reviewed:  { color: 'var(--green)',  bg: 'color-mix(in oklab, var(--green) 8%, var(--surface))',  border: 'color-mix(in oklab, var(--green) 20%, var(--border))'  },
  dismissed: { color: 'var(--text-3)', bg: 'var(--surface-2)', border: 'var(--border)' },
};

function ReportCard({ report, lang }) {
  const T = STRINGS[lang] || STRINGS.en;
  const chat = EFHooks.useOrderChat(report.orderId);
  const reportedMessages = (chat?.messages || []).filter(m => (report.messageIds || []).includes(m.id));
  const order = D.liveOrders().find(o => o.id === report.orderId);
  const st = STATUS_META[report.status] || STATUS_META.pending;
  const statusLabel = T[report.status] || report.status;

  return (
    <div className="card" style={{ marginBottom: 16, border: `1px solid ${st.border}` }}>
      <div className="card-pad" style={{ borderBottom: `1px solid ${st.border}`, display: 'flex', alignItems: 'center', gap: 10, background: st.bg }}>
        <Icon name="flag" size={13} style={{ color: st.color, flexShrink: 0 }}/>
        <span className="mono fs-11 text-faint">#{report.orderId}</span>
        {order && (
          <span className="fs-12 text-muted" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {order.title}
          </span>
        )}
        <span style={{ fontSize: 12, color: st.color, fontWeight: 600, flexShrink: 0 }}>{statusLabel}</span>
        <span className="mono fs-11 text-faint" style={{ flexShrink: 0 }}>{U.fmtDate(report.reportedAt)}</span>
      </div>
      <div className="card-pad">
        <div className="fs-12 text-muted mb-2">
          <strong>{report.count}</strong> {report.count === 1 ? T.message : T.messages} · {T.reason}: <em>{report.reason}</em>
        </div>

        {report.status === 'reviewed' && report.reviewNote && (
          <div style={{ marginBottom: 14, padding: '8px 12px', background: 'color-mix(in oklab, var(--green) 7%, var(--surface))', border: '1px solid color-mix(in oklab, var(--green) 25%, var(--border))', borderRadius: 8 }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon name="check-circle" size={13} style={{ color: 'var(--green)' }}/>
              <strong style={{ fontSize: 12 }}>{T.adminNote}</strong>
            </div>
            <span className="fs-12" style={{ color: 'var(--text-2)' }}>{report.reviewNote}</span>
          </div>
        )}

        <div>
          <div className="fs-11 text-faint mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
            {T.reportedMessages}
          </div>
          {reportedMessages.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {reportedMessages.map(m => (
                <div key={m.id} style={{ borderLeft: '3px solid var(--amber)', paddingLeft: 10, paddingTop: 6, paddingBottom: 6, background: 'color-mix(in oklab, var(--amber) 5%, var(--surface))', borderRadius: '0 6px 6px 0' }}>
                  <div className="fs-11 text-faint mb-1" style={{ textTransform: 'capitalize' }}>
                    {m.authorRole} · {U.fmtDate(m.at)}
                  </div>
                  <div className="fs-13">{m.body}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="fs-12 text-faint">{T.noMessages}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MyReportsView({ lang = 'en', userId, reporterRole }) {
  const T = STRINGS[lang] || STRINGS.en;
  const allReports = EFHooks.useChatReports();
  const reports = allReports.filter(r => {
    if (r.reporterRole !== reporterRole) return false;
    if (reporterRole === 'customer' && r.customerId !== userId) return false;
    if (reporterRole === 'gw' && r.gwId !== userId) return false;
    return true;
  });

  if (reports.length === 0) {
    return <EmptyState icon="flag" title={T.emptyTitle} body={T.emptyBody}/>;
  }

  return (
    <div>
      {reports.map(r => <ReportCard key={r.id} report={r} lang={lang}/>)}
    </div>
  );
}

export { MyReportsView };
