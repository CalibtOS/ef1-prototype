// Shared · BookMeetingCard — booking surface for customers and GWs.
//
// Props:
//   customerId    — ID of the customer (null for GW-only meetings)
//   gwId          — ID of the GW (null for customer-only meetings)
//   orderId       — links the meeting to a specific order
//   requesterRole — 'customer' | 'gw'
//   cardTitle     — display title for the card header
//
// Flow: "Book Meeting" button → availability grid → slot selection →
//       confirm → pending_approval request (admin must approve).
import React from 'react';
import { Icon } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import { AvailabilityGrid } from './availability-grid.jsx';

function BookMeetingCard({ customerId, gwId, orderId, requesterRole, cardTitle }) {
  const [showGrid, setShowGrid] = React.useState(false);
  const [showReschedulePicker, setShowReschedulePicker] = React.useState(false);
  const [selectedSlotId, setSelectedSlotId] = React.useState(null);

  const meeting = EFHooks.useMeetingByOrder(orderId);
  const allSlots = EFHooks.useAllSlots();

  const title = cardTitle || (requesterRole === 'gw' ? 'Meeting with Admin' : 'Zoom-Termin');

  function handleSlotSelect(slot) {
    setSelectedSlotId(prev => (prev === slot.id ? null : slot.id));
  }

  function handleConfirm() {
    if (!selectedSlotId) return;
    EFActions.meetings.request(selectedSlotId, customerId || null, orderId, requesterRole, gwId || null);
    setSelectedSlotId(null);
    setShowGrid(false);
  }

  function handleReschedule(slot) {
    if (!meeting) return;
    EFActions.meetings.reschedule(meeting.id, slot.id);
    setShowReschedulePicker(false);
  }

  function handleCancel() {
    if (window.confirm('Termin stornieren?')) EFActions.meetings.cancel(meeting.id);
  }

  // — Existing meeting (scheduled or pending_approval) —
  if (meeting) {
    const isPending = meeting.status === 'pending_approval';
    return (
      <div className="card">
        <div className="card-head">
          <div className="card-title"><Icon name="video" size={13}/> {title}</div>
          {isPending
            ? <span className="pill pill-amber" style={{ fontSize: 10 }}>Ausstehend</span>
            : <span className="pill pill-green" style={{ fontSize: 10 }}><Icon name="check-circle" size={9}/> Bestätigt</span>}
        </div>
        <div className="card-pad">
          {showReschedulePicker ? (
            <div className="flex-col gap-3">
              <div className="text-muted fs-12">Neuen Termin wählen:</div>
              <AvailabilityGrid slots={allSlots} onSelectSlot={handleReschedule}/>
              <button type="button" className="btn btn-sm" onClick={() => setShowReschedulePicker(false)}>Zurück</button>
            </div>
          ) : (
            <div className="flex-col gap-2">
              {isPending && (
                <div className="banner info" style={{ fontSize: 12 }}>
                  <Icon name="clock" size={12}/>
                  <span>Ihre Anfrage wartet auf die Bestätigung durch efactory1.</span>
                </div>
              )}
              <div className="kv" style={{ fontSize: 12 }}>
                <div className="kv-row"><dt>Datum</dt><dd className="mono">{U.fmtDate(meeting.date)}</dd></div>
                <div className="kv-row"><dt>Uhrzeit</dt><dd className="mono">{meeting.startTime}</dd></div>
              </div>
              <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: 4 }}>
                {!isPending && meeting.zoomUrl && (
                  <a href={meeting.zoomUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary" style={{ textDecoration: 'none' }}>
                    <Icon name="video" size={12}/> Join Meeting
                  </a>
                )}
                {!isPending && (
                  <button type="button" className="btn btn-sm" onClick={() => setShowReschedulePicker(true)}>
                    <Icon name="rotate-ccw" size={12}/> Reschedule
                  </button>
                )}
                <button type="button" className="btn btn-sm"
                  style={{ color: 'var(--red)', borderColor: 'color-mix(in oklab, var(--red) 40%, var(--border))' }}
                  onClick={handleCancel}
                >
                  <Icon name="x" size={12}/> Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // — No meeting: show button or grid —
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title"><Icon name="video" size={13}/> {title}</div>
      </div>
      <div className="card-pad">
        {!showGrid ? (
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setShowGrid(true)}>
            <Icon name="calendar" size={12}/> Termin buchen
          </button>
        ) : (
          <div className="flex-col gap-3">
            <div className="text-muted fs-12">
              Wählen Sie einen freien Termin — die Anfrage wird an efactory1 zur Bestätigung weitergeleitet.
            </div>
            <AvailabilityGrid
              slots={allSlots}
              onSelectSlot={handleSlotSelect}
              selectedSlotId={selectedSlotId}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-primary"
                disabled={!selectedSlotId}
                onClick={handleConfirm}
              >
                <Icon name="send" size={12}/> Anfrage senden
              </button>
              <button type="button" className="btn btn-sm" onClick={() => { setShowGrid(false); setSelectedSlotId(null); }}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { BookMeetingCard };
