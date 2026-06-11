// Shared · MeetingAgenda — chronological, day-grouped list of meetings.
// Pass already-filtered meetings; this component only sorts and groups.
// Provide renderActions(meeting) to add role-specific buttons per row.
import React from 'react';
import { Icon } from '../../utils.jsx';
import * as U from '../../utils.jsx';

function groupByDate(meetings) {
  const sorted = [...meetings].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
  });
  const groups = [];
  let cur = null;
  for (const m of sorted) {
    if (!cur || cur.date !== m.date) {
      cur = { date: m.date, items: [] };
      groups.push(cur);
    }
    cur.items.push(m);
  }
  return groups;
}

function MeetingAgenda({ meetings = [], emptyText = 'No upcoming meetings.', renderActions, renderLabel }) {
  const groups = groupByDate(meetings || []);

  if (groups.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className="flex-col">
      {groups.map((group, gi) => (
        <div key={group.date}>
          <div style={{
            padding: '7px 16px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: 'var(--surface-2)',
            borderTop: gi > 0 ? '1px solid var(--border)' : undefined,
            borderBottom: '1px solid var(--border)',
          }}>
            {U.fmtDate(group.date)}
          </div>
          {group.items.map((m, mi) => (
            <div
              key={m.id}
              className="flex items-center gap-3"
              style={{
                padding: '10px 16px',
                borderBottom: mi < group.items.length - 1 ? '1px solid var(--border)' : undefined,
              }}
            >
              <span className="mono" style={{ minWidth: 48, fontSize: 13, fontWeight: 600 }}>{m.startTime}</span>
              <div className="flex-col" style={{ flex: 1, lineHeight: 1.35, minWidth: 0 }}>
                {renderLabel ? renderLabel(m) : (
                  m.orderId
                    ? <span className="mono fs-12 text-faint">Order #{m.orderId}</span>
                    : <span className="mono fs-12 text-faint">{m.customerId}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {m.zoomUrl && (
                  <a
                    href={m.zoomUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-primary"
                    style={{ textDecoration: 'none' }}
                  >
                    <Icon name="video" size={12}/> Join
                  </a>
                )}
                {renderActions && renderActions(m)}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export { MeetingAgenda };
