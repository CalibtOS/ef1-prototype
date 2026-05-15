// GW · Calendar — monthly view of all assignment deadlines.

import React, { useState, useMemo } from 'react';
import { Icon } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import EF from '../core/ef.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday-first: convert Sun=0 → Sun=6
  const startDow = (firstDay.getDay() + 6) % 7;
  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function toDateKey(isoOrDate) {
  if (!isoOrDate) return null;
  const d = new Date(isoOrDate);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function GWCalendar({ navigate }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const mine = EFHooks.useOrders({ gwId: EF.GW_ME.id });

  const deadlineMap = useMemo(() => {
    const map = {};
    const add = (iso, orderId, title, type) => {
      if (!iso) return;
      const key = toDateKey(iso);
      if (!map[key]) map[key] = [];
      map[key].push({ orderId, title, type, meta: U.deadlineMeta(iso), iso });
    };
    mine.forEach(o => {
      const title = o.titleTBD ? `#${o.id} (title TBD)` : o.title;
      add(o.interimDeadline, o.id, title, 'I1');
      add(o.interim2Deadline, o.id, title, 'I2');
      add(o.finalDeadline, o.id, title, 'Final');
    });
    return map;
  }, [mine]);

  const days = buildCalendarGrid(year, month);
  const todayKey = toDateKey(today);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const monthDeadlines = Object.entries(deadlineMap).filter(([k]) => {
    const d = new Date(k);
    return d.getFullYear() === year && d.getMonth() === month;
  }).reduce((s, [, v]) => s + v.length, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Deadline Calendar</h1>
          <div className="page-subtitle">
            {monthDeadlines} deadline{monthDeadlines !== 1 ? 's' : ''} in {MONTHS[month]} {year}
          </div>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>
            <Icon name="calendar" size={14}/> Today
          </button>
          <button className="btn btn-primary" onClick={() => navigate('gw-active')}>
            <Icon name="briefcase" size={14}/> My Assignments
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="flex items-center gap-2">
            <button className="btn btn-sm" onClick={prevMonth}><Icon name="chevron-left" size={14}/></button>
            <span className="strong" style={{ fontSize: 14, minWidth: 170, textAlign: 'center' }}>
              {MONTHS[month]} {year}
            </span>
            <button className="btn btn-sm" onClick={nextMonth}><Icon name="chevron-right" size={14}/></button>
          </div>
          <div className="flex items-center gap-4 fs-11 text-faint">
            <span className="flex items-center gap-1">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--amber)', display: 'inline-block' }}/>
              Interim
            </span>
            <span className="flex items-center gap-1">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--blue)', display: 'inline-block' }}/>
              Final
            </span>
            <span className="flex items-center gap-1">
              <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--red)', display: 'inline-block' }}/>
              Overdue / urgent
            </span>
          </div>
        </div>

        {/* Weekday header row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          {WEEKDAYS.map((wd, i) => (
            <div
              key={wd}
              style={{
                padding: '7px 10px',
                fontSize: 10.5,
                fontWeight: 600,
                color: 'var(--text-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                textAlign: 'center',
                borderRight: i < 6 ? '1px solid var(--border)' : undefined,
              }}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {days.map((day, i) => {
            const dateKey = day ? toDateKey(day) : null;
            const items = dateKey ? (deadlineMap[dateKey] || []) : [];
            const isToday = dateKey === todayKey;
            const isPast = day && day < today && !isToday;
            const col = i % 7;
            const isLastInRow = col === 6;

            return (
              <div
                key={i}
                style={{
                  minHeight: 96,
                  padding: '6px 7px',
                  borderRight: !isLastInRow ? '1px solid var(--border)' : undefined,
                  borderBottom: i < days.length - 7 ? '1px solid var(--border)' : undefined,
                  background: !day
                    ? 'var(--surface-2)'
                    : isToday
                    ? 'color-mix(in oklab, var(--blue) 5%, var(--surface))'
                    : 'var(--surface)',
                }}
              >
                {day && (
                  <>
                    <div style={{ marginBottom: items.length ? 5 : 0 }}>
                      {isToday ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'var(--blue)', color: 'white',
                          fontSize: 11.5, fontWeight: 700,
                        }}>
                          {day.getDate()}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 500, color: isPast ? 'var(--text-3)' : 'var(--text)' }}>
                          {day.getDate()}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {items.map((item, j) => {
                        const isInterim = item.type !== 'Final';
                        const { tone } = item.meta;
                        const accentColor = tone === 'danger' || tone === 'warn'
                          ? 'var(--red)'
                          : isInterim ? 'var(--amber)' : 'var(--blue)';
                        const accentSoft = tone === 'danger' || tone === 'warn'
                          ? 'var(--red-soft)'
                          : isInterim ? 'var(--amber-soft)' : 'var(--blue-soft)';
                        const labelColor = tone === 'danger' || tone === 'warn'
                          ? 'var(--red)'
                          : isInterim ? '#B45309' : 'var(--blue)';

                        return (
                          <button
                            key={j}
                            onClick={() => navigate('order-detail', { id: item.orderId })}
                            title={`${item.title} · ${item.type} deadline · ${U.fmtDate(item.iso)}, 18:00`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              padding: '2px 5px', borderRadius: 4,
                              background: accentSoft,
                              border: `1px solid color-mix(in oklab, ${accentColor} 28%, transparent)`,
                              cursor: 'pointer', width: '100%', textAlign: 'left',
                              font: 'inherit', color: labelColor,
                            }}
                          >
                            <span style={{
                              flexShrink: 0,
                              fontSize: 9, fontWeight: 700, lineHeight: 1.2,
                              padding: '1px 3px', borderRadius: 3,
                              background: accentColor, color: 'white',
                            }}>
                              {item.type}
                            </span>
                            <span className="mono" style={{
                              fontSize: 10, fontWeight: 600,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                            }}>
                              #{item.orderId}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { GWCalendar };
