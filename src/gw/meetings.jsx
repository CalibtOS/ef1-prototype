// GW · Meetings — agenda of scheduled and pending meeting requests.
import React from 'react';
import { Icon } from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
import { MeetingAgenda } from '../shared/meeting-agenda.jsx';

function GWMeetings({ navigate }) {
  const gwId        = EFHooks.useStore(s => s.session.gwId) || EF.GW_ME?.id;
  const allMeetings = EFHooks.useAllMeetings();
  const ordersTable = EFHooks.useStore(s => s.entities.orders);

  const myMeetings = (allMeetings || []).filter(
    m => m.gwId === gwId && (m.status === 'scheduled' || m.status === 'pending_approval')
  );
  const scheduledCount = myMeetings.filter(m => m.status === 'scheduled').length;
  const pendingCount   = myMeetings.filter(m => m.status === 'pending_approval').length;

  function orderTitle(orderId) {
    if (!orderId || !ordersTable) return null;
    return ordersTable.byId?.[String(orderId)]?.title || null;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['GW', 'Meetings']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>My Meetings</h1>
          <div className="page-subtitle">Scheduled and pending Zoom sessions with efactory1</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Agenda</div>
          <div className="flex items-center gap-2">
            {scheduledCount > 0 && <span className="pill pill-green" style={{ fontSize: 10 }}>{scheduledCount} confirmed</span>}
            {pendingCount > 0   && <span className="pill pill-amber" style={{ fontSize: 10 }}>{pendingCount} pending</span>}
          </div>
        </div>
        <MeetingAgenda
          meetings={myMeetings}
          emptyText="No meetings scheduled. Book one from your assignment detail page."
          renderLabel={(m) => {
            const title = orderTitle(m.orderId);
            return (
              <div className="flex-col" style={{ lineHeight: 1.35 }}>
                <span style={{ fontSize: 12, fontWeight: 500 }}>Berat Özdemir · efactory1</span>
                <div className="flex items-center gap-1" style={{ marginTop: 1 }}>
                  {title && <span className="fs-11 text-faint">{title.length > 40 ? title.slice(0, 40) + '…' : title}</span>}
                  {m.duration && <span className="mono fs-11 text-faint">{title ? ' · ' : ''}{m.duration} min</span>}
                </div>
              </div>
            );
          }}
          renderActions={(m) => (
            <div className="flex items-center gap-2">
              {m.status === 'pending_approval' && (
                <span className="pill pill-amber" style={{ fontSize: 10 }}>Pending approval</span>
              )}
              <button
                type="button"
                className="btn btn-sm"
                style={{ color: 'var(--red)', borderColor: 'color-mix(in oklab, var(--red) 40%, var(--border))' }}
                onClick={() => { if (window.confirm('Cancel this meeting request?')) EFActions.meetings.cancel(m.id); }}
              >
                <Icon name="x" size={12}/> Cancel
              </button>
            </div>
          )}
        />
      </div>
    </div>
  );
}

export { GWMeetings };
