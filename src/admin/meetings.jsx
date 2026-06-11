// Admin · Meetings — editable availability grid, pending requests, agenda.
import React from 'react';
import { Icon } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import { AvailabilityGrid } from '../shared/availability-grid.jsx';
import { MeetingAgenda } from '../shared/meeting-agenda.jsx';

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

function AdminMeetings({ navigate }) {
  const slots      = EFHooks.useAllSlots();
  const meetings   = EFHooks.useAllMeetings();
  const pending    = EFHooks.usePendingMeetings();
  const customers  = EFHooks.useCustomers();
  const ghostwriters = EFHooks.useGhostwriters();
  const orders     = EFHooks.useOrders();

  // O(1) lookup maps built from live store arrays
  const custById  = React.useMemo(() => Object.fromEntries((customers  || []).map(c => [c.id, c])), [customers]);
  const gwById    = React.useMemo(() => Object.fromEntries((ghostwriters || []).map(g => [g.id, g])), [ghostwriters]);
  const orderById = React.useMemo(() => Object.fromEntries((orders     || []).map(o => [String(o.id), o])), [orders]);

  const scheduled = (meetings || []).filter(m => m.status === 'scheduled');

  function resolvePerson(m) {
    return m.requesterRole === 'gw'
      ? gwById[m.gwId]
      : custById[m.customerId];
  }

  function resolveOrder(m) {
    return m.orderId ? orderById[String(m.orderId)] : null;
  }

  // Rich label used in both the agenda and (via inline JSX) the pending table
  function AgendaLabel({ m }) {
    const person = resolvePerson(m);
    const ord    = resolveOrder(m);
    return (
      <div className="flex-col" style={{ lineHeight: 1.35 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>
          {person?.name || m.gwId || m.customerId}
          <span className={`pill pill-${m.requesterRole === 'gw' ? 'teal' : 'blue'}`} style={{ fontSize: 9, marginLeft: 6 }}>
            {m.requesterRole === 'gw' ? 'GW' : 'Customer'}
          </span>
        </span>
        <div className="flex items-center gap-2" style={{ marginTop: 2 }}>
          {ord && (
            <span className="mono fs-11 text-faint">
              #{m.orderId} · {truncate(ord.title, 40)}
            </span>
          )}
          {m.duration && (
            <span className="mono fs-11 text-faint">{!ord ? `Order #${m.orderId} · ` : '· '}{m.duration} min</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Meetings']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Meetings</h1>
          <div className="page-subtitle">Verfügbarkeit bearbeiten · Anfragen genehmigen · Termine im Überblick</div>
        </div>
      </div>

      {/* Section A — Editable Availability Schedule */}
      <div className="card mb-4" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-title">Availability Schedule</div>
          <span className="text-faint fs-12">
            Week · {U.fmtDate('2026-06-08')} – {U.fmtDate('2026-06-12')} · Click Free to remove · Click + to add
          </span>
        </div>
        <AvailabilityGrid
          slots={slots}
          editable
          onToggleSlot={(weekday, startTime) => EFActions.slots.toggle(weekday, startTime)}
        />
      </div>

      {/* Section B — Pending Meeting Requests */}
      <div className="card mb-4" style={{ marginBottom: 16 }}>
        <div className="card-head">
          <div className="card-title">Meeting Requests</div>
          {pending.length > 0
            ? <span className="pill pill-amber" style={{ fontSize: 11 }}>{pending.length} pending</span>
            : <span className="text-faint fs-12">No pending requests</span>}
        </div>
        {pending.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>
            No pending meeting requests.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Requester</th>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(m => {
                  const person = resolvePerson(m);
                  const ord    = resolveOrder(m);
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="flex-col" style={{ lineHeight: 1.3 }}>
                          <span className="fs-12" style={{ fontWeight: 500 }}>
                            {person?.name || m.gwId || m.customerId}
                            <span className={`pill pill-${m.requesterRole === 'gw' ? 'teal' : 'blue'}`} style={{ fontSize: 9, marginLeft: 6 }}>
                              {m.requesterRole === 'gw' ? 'GW' : 'Customer'}
                            </span>
                          </span>
                          {person?.email && <span className="mono fs-11 text-faint">{person.email}</span>}
                        </div>
                      </td>
                      <td>
                        {ord
                          ? <div className="flex-col" style={{ lineHeight: 1.3 }}>
                              <span className="mono fs-11">#{m.orderId}</span>
                              <span className="fs-11 text-faint">{truncate(ord.title, 36)}</span>
                            </div>
                          : <span className="mono fs-12 text-faint">{m.orderId ? `#${m.orderId}` : '—'}</span>}
                      </td>
                      <td className="mono fs-12">{U.fmtDate(m.date)}</td>
                      <td className="mono fs-12">{m.startTime}{m.duration ? ` · ${m.duration} min` : ''}</td>
                      <td>
                        <div className="flex gap-2">
                          <button type="button" className="btn btn-sm btn-success" onClick={() => EFActions.meetings.approve(m.id)}>
                            <Icon name="check" size={12}/> Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{ color: 'var(--red)', borderColor: 'color-mix(in oklab, var(--red) 40%, var(--border))' }}
                            onClick={() => EFActions.meetings.reject(m.id)}
                          >
                            <Icon name="x" size={12}/> Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section C — Agenda (confirmed meetings) */}
      <div className="card">
        <div className="card-head">
          <div className="card-title">Agenda</div>
          <span className="text-faint fs-12">{scheduled.length} scheduled</span>
        </div>
        <MeetingAgenda
          meetings={scheduled}
          emptyText="No scheduled meetings."
          renderLabel={(m) => <AgendaLabel m={m}/>}
          renderActions={(m) => (
            <button
              type="button"
              className="btn btn-sm"
              style={{ color: 'var(--red)', borderColor: 'color-mix(in oklab, var(--red) 40%, var(--border))' }}
              onClick={() => EFActions.meetings.cancel(m.id)}
            >
              <Icon name="x" size={12}/> Cancel
            </button>
          )}
        />
      </div>
    </div>
  );
}

export { AdminMeetings };
