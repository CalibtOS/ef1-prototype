// Admin · Order detail · Audit Log sub-tab.
// Extracted from src/admin/order-detail.jsx as part of the Arch-05 split.
// Each sub-tab takes `(order, params)` props and lives in its own file so
// the parent shell becomes a routable layout rather than a 2000-LOC monolith.

import React from 'react';
import { Icon, EmptyState } from '../../../utils.jsx';
import * as U from '../../../utils.jsx';
import * as EFHooks from '../../core/hooks.js';

function AuditTab({ order, events }) {
  const fallbackRows = EFHooks.useOrderEvents(order.id);
  const rows = events || fallbackRows;
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Audit log</div>
        <span className="text-faint fs-11">{rows.length} synchronized event(s)</span>
      </div>
      <div className="card-pad">
        {rows.length === 0 ? (
          <EmptyState compact icon="history" title="No audit events" body="This order has no lifecycle events yet."/>
        ) : (
          <div className="timeline">
            {rows.map(e => (
              <div key={`${e.key}-${e.at}`} className="timeline-item">
                <div className={`timeline-dot ${e.dot || ''}`}><Icon name={e.icon || 'dot'} size={10}/></div>
                <div className="timeline-content">
                  <div className="timeline-title">{e.title} <span className="pill pill-slate" style={{ fontSize: 9, marginLeft: 6 }}>{e.domain}</span></div>
                  {e.detail && <div className="timeline-meta">{e.detail}</div>}
                  <div className="timeline-meta mono">{U.fmtDateTime(e.at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { AuditTab };
