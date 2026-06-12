// Shared · AvailabilityGrid — weekly slot grid.
//
// Modes (mutually exclusive props):
//   editable + onToggleSlot  → admin can click "—" to add a slot, "Free" to remove one
//   onSelectSlot             → customer/GW can click "Free" to pick a slot for booking
//   (neither)                → read-only display
//
// selectedSlotId highlights the currently chosen slot in selection mode.
import React from 'react';
import * as U from '../../utils.jsx';
import { MEETING_WEEK_DATES } from '../core/entities.js';

const WEEKDAYS = Object.keys(MEETING_WEEK_DATES);
const GRID_TIMES = (() => {
  const ts = [];
  for (let h = 9; h <= 17; h++) {
    ts.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 17) ts.push(`${String(h).padStart(2, '0')}:30`);
  }
  return ts;
})();

function buildIndex(slots) {
  const idx = {};
  (slots || []).forEach(s => { idx[`${s.weekday}-${s.startTime}`] = s; });
  return idx;
}

function AvailabilityGrid({ slots, editable, onToggleSlot, onSelectSlot, selectedSlotId }) {
  const index = buildIndex(slots);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="tbl" style={{ tableLayout: 'fixed', minWidth: 520 }}>
        <thead>
          <tr>
            <th style={{ width: 64, fontSize: 11, color: 'var(--text-3)' }}>Time</th>
            {WEEKDAYS.map(d => (
              <th key={d} style={{ textAlign: 'center', fontWeight: 600 }}>
                {d}
                <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-3)' }}>{U.fmtDate(MEETING_WEEK_DATES[d])}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GRID_TIMES.map(time => (
            <tr key={time}>
              <td className="mono fs-11 text-faint" style={{ padding: '3px 12px' }}>{time}</td>
              {WEEKDAYS.map(day => {
                const slot = index[`${day}-${time}`];

                if (!slot) {
                  const addable = editable && !!onToggleSlot;
                  return (
                    <td key={day} style={{ padding: 3, textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'block', padding: '3px 0', borderRadius: 4,
                          background: 'var(--surface-2)',
                          color: addable ? 'var(--text-2)' : 'var(--text-3)',
                          fontSize: 11,
                          cursor: addable ? 'pointer' : 'default',
                        }}
                        title={addable ? 'Add availability' : undefined}
                        onClick={addable ? () => onToggleSlot(day, time) : undefined}
                      >
                        {addable ? '+' : '—'}
                      </span>
                    </td>
                  );
                }

                if (slot.isPending) {
                  return (
                    <td key={day} style={{ padding: 3, textAlign: 'center' }}>
                      <span className="pill pill-amber" style={{ fontSize: 10, display: 'block', justifyContent: 'center' }}>Pending</span>
                    </td>
                  );
                }

                if (slot.isBooked) {
                  return (
                    <td key={day} style={{ padding: 3, textAlign: 'center' }}>
                      <span className="pill pill-slate" style={{ fontSize: 10, display: 'block', justifyContent: 'center' }}>Booked</span>
                    </td>
                  );
                }

                // Free slot
                const isSelected = selectedSlotId === slot.id;
                const canSelect = !!onSelectSlot;
                const canRemove = editable && !!onToggleSlot;

                return (
                  <td key={day} style={{ padding: 3, textAlign: 'center' }}>
                    <span
                      className={isSelected ? 'pill pill-blue' : 'pill pill-green'}
                      style={{
                        fontSize: 10, display: 'block', justifyContent: 'center',
                        cursor: canSelect || canRemove ? 'pointer' : 'default',
                        outline: isSelected ? '2px solid var(--blue)' : 'none',
                        outlineOffset: 1,
                      }}
                      title={canRemove ? 'Remove availability' : canSelect ? 'Select this slot' : undefined}
                      onClick={
                        canSelect ? () => onSelectSlot(slot)
                        : canRemove ? () => onToggleSlot(day, time)
                        : undefined
                      }
                    >
                      {isSelected ? 'Selected' : 'Free'}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { AvailabilityGrid };
