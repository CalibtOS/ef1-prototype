// Admin · Chat Reports — moderation view for reported chat messages.
import React, { useState } from 'react';
import { Icon, Avatar, EmptyState } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';

const D = EF;

const STATUS_STYLES = {
  pending:  { color: 'var(--amber)',  label: 'Pending'  },
  reviewed: { color: 'var(--green)',  label: 'Reviewed' },
  dismissed:{ color: 'var(--text-3)', label: 'Dismissed' },
};

function ChatReportsPage({ navigate }) {
  const reports = EFHooks.useChatReports();
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = statusFilter === 'all'
    ? reports
    : reports.filter(r => r.status === statusFilter);

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Chat Reports']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Chat Reports</h1>
          <div className="page-subtitle">
            Messages reported by customers or ghostwriters · click a row to view the chat
          </div>
        </div>
        {pendingCount > 0 && (
          <div className="page-actions">
            <span className="pill pill-amber" style={{ fontSize: 13, padding: '4px 10px' }}>
              <Icon name="flag" size={12}/> {pendingCount} pending
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        {[
          ['all', 'All', reports.length],
          ['pending', 'Pending', pendingCount],
          ['reviewed', 'Reviewed', reports.filter(r => r.status === 'reviewed').length],
          ['dismissed', 'Dismissed', reports.filter(r => r.status === 'dismissed').length],
        ].map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            className={`chip ${statusFilter === id ? 'active' : ''}`}
            onClick={() => setStatusFilter(id)}
          >
            {label}
            {count > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>{count}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="flag"
          title={statusFilter === 'all' ? 'No reports yet' : `No ${statusFilter} reports`}
          body={statusFilter === 'all' ? 'Reports submitted by customers or ghostwriters will appear here.' : 'Change the filter to see other reports.'}
        />
      ) : (
        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Reported by</th>
                  <th>Reported messages</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const order = D.liveOrders().find(o => o.id === r.orderId);
                  const reporter = r.reporterRole === 'customer'
                    ? D.customer(r.customerId)
                    : r.reporterRole === 'gw'
                      ? D.gw(r.gwId)
                      : null;
                  const st = STATUS_STYLES[r.status] || STATUS_STYLES.pending;

                  return (
                    <tr
                      key={r.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate('order-detail', { id: r.orderId, tab: 'communications', reportId: r.id })}
                    >
                      <td className="mono">
                        <span style={{ fontWeight: 600 }}>#{r.orderId}</span>
                        {order && (
                          <div className="text-faint fs-11" style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.title}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar
                            initials={reporter?.initials || '??'}
                            size={24}
                            tone={r.reporterRole === 'customer' ? 'blue' : 'amber'}
                          />
                          <div>
                            <div className="fs-12">{reporter?.name || 'Unknown'}</div>
                            <div className="text-faint fs-11" style={{ textTransform: 'capitalize' }}>{r.reporterRole}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{r.count}</span>
                        <span className="text-faint fs-11"> {r.count === 1 ? 'message' : 'messages'}</span>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <span className="fs-12" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {r.reason}
                        </span>
                      </td>
                      <td className="mono fs-11 text-muted">{U.fmtDate(r.reportedAt)}</td>
                      <td>
                        <span className="fs-12" style={{ color: st.color, fontWeight: 500 }}>
                          {st.label}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {r.status === 'pending' && (
                            <button
                              type="button"
                              className="btn btn-sm"
                              onClick={() => EFActions.chatReports.updateStatus(r.id, 'reviewed')}
                            >
                              Review
                            </button>
                          )}
                          {r.status !== 'dismissed' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              style={{ color: 'var(--text-3)', fontSize: 11 }}
                              onClick={() => EFActions.chatReports.updateStatus(r.id, 'dismissed')}
                            >
                              Dismiss
                            </button>
                          )}
                          {r.status === 'dismissed' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              style={{ fontSize: 11 }}
                              onClick={() => EFActions.chatReports.updateStatus(r.id, 'pending')}
                            >
                              Reopen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="card-pad flex justify-between" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-muted fs-12">{filtered.length} {filtered.length === 1 ? 'report' : 'reports'} shown</span>
          </div>
        </div>
      )}
    </div>
  );
}

export { ChatReportsPage };
