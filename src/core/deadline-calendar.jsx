// Generic deadline calendar — interim/final deadlines plotted in a Month,
// Week, or Day view. Used by GW (My Assignments) and Admin (Orders).

import React, { useState, useMemo } from 'react';
import { Icon } from '../../utils.jsx';
import * as U from '../../utils.jsx';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAYS_LONG = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ---------- date helpers ----------

function toDateKey(isoOrDate) {
  if (!isoOrDate) return null;
  const d = new Date(isoOrDate);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Monday-first week start
function startOfWeek(d) {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // 0 = Mon … 6 = Sun
  x.setDate(x.getDate() - dow);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function buildMonthGrid(cursor) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday-first
  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function buildWeekGrid(cursor) {
  const start = startOfWeek(cursor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// ---------- shared deadline pill ----------

function pillStyles(item) {
  const isInterim = item.type !== 'Final';
  // Red is reserved for "overdue" and "due today" only.
  // Tomorrow (D-1) and beyond keep the deadline's base color (amber for
  // Interim, blue for Final). We compute this from days-to instead of the
  // shared `tone` field because `tone === 'danger'` also covers D-1, which
  // we explicitly don't want to surface as red on the calendar.
  const days = U.daysTo(item.iso);
  const isUrgent = days != null && days <= 0;
  const accentColor = isUrgent ? 'var(--red)' : isInterim ? 'var(--amber)' : 'var(--blue)';
  const accentSoft = isUrgent ? 'var(--red-soft)' : isInterim ? 'var(--amber-soft)' : 'var(--blue-soft)';
  const labelColor = isUrgent ? 'var(--red)' : isInterim ? '#B45309' : 'var(--blue)';
  return { accentColor, accentSoft, labelColor };
}

function DeadlinePill({ item, onClick, size = 'sm' }) {
  const { accentColor, accentSoft, labelColor } = pillStyles(item);
  const isLg = size === 'lg';
  return (
    <button
      onClick={onClick}
      title={`${item.title} · ${item.type} deadline · ${U.fmtDate(item.iso)}, 18:00`}
      style={{
        display: 'flex', alignItems: 'center', gap: isLg ? 8 : 4,
        padding: isLg ? '6px 10px' : '2px 5px', borderRadius: isLg ? 6 : 4,
        background: accentSoft,
        border: `1px solid color-mix(in oklab, ${accentColor} 28%, transparent)`,
        cursor: 'pointer', width: '100%', textAlign: 'left',
        font: 'inherit', color: labelColor,
      }}
    >
      <span style={{
        flexShrink: 0,
        fontSize: isLg ? 10.5 : 9,
        fontWeight: 700, lineHeight: 1.2,
        padding: isLg ? '2px 6px' : '1px 3px', borderRadius: 3,
        background: accentColor, color: 'white',
      }}>
        {item.type}
      </span>
      <span className="mono" style={{
        fontSize: isLg ? 12 : 10,
        fontWeight: 600, flexShrink: 0,
      }}>
        #{item.orderId}
      </span>
      {isLg && (
        <>
          <span style={{
            fontSize: 12, fontWeight: 500, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {item.title}
          </span>
          <span className="text-faint fs-11" style={{ flexShrink: 0 }}>
            {item.meta.label}
          </span>
        </>
      )}
    </button>
  );
}

// ---------- main component ----------

// Props:
//   orders        — array of order records (already filtered by caller)
//   onSelectOrder — (orderId) => void; falls back to navigate('order-detail', { id })
//   navigate      — optional fallback for click handler
function DeadlineCalendar({ orders = [], onSelectOrder, navigate }) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const [cursor, setCursor] = useState(today);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'

  const handleSelect = (orderId) => {
    if (onSelectOrder) onSelectOrder(orderId);
    else if (navigate) navigate('order-detail', { id: orderId });
  };

  const deadlineMap = useMemo(() => {
    const map = {};
    const add = (iso, orderId, title, type) => {
      if (!iso) return;
      const key = toDateKey(iso);
      if (!map[key]) map[key] = [];
      map[key].push({ orderId, title, type, meta: U.deadlineMeta(iso), iso });
    };
    orders.forEach(o => {
      const title = o.titleTBD ? `#${o.id} (title TBD)` : o.title;
      // Both interim deadlines render as "Interim". The numeric distinction
      // (1st vs 2nd) is intentionally hidden — it confuses with "days left".
      add(o.interimDeadline, o.id, title, 'Interim');
      add(o.interim2Deadline, o.id, title, 'Interim');
      add(o.finalDeadline, o.id, title, 'Final');
    });
    return map;
  }, [orders]);

  // ---------- navigation ----------

  const stepBack = () => {
    if (viewMode === 'month') {
      const c = new Date(cursor);
      c.setMonth(c.getMonth() - 1);
      setCursor(c);
    } else if (viewMode === 'week') {
      setCursor(addDays(cursor, -7));
    } else {
      setCursor(addDays(cursor, -1));
    }
  };
  const stepForward = () => {
    if (viewMode === 'month') {
      const c = new Date(cursor);
      c.setMonth(c.getMonth() + 1);
      setCursor(c);
    } else if (viewMode === 'week') {
      setCursor(addDays(cursor, 7));
    } else {
      setCursor(addDays(cursor, 1));
    }
  };
  const goToday = () => setCursor(today);

  // ---------- title ----------

  let title;
  if (viewMode === 'month') {
    title = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  } else if (viewMode === 'week') {
    const start = startOfWeek(cursor);
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    title = sameMonth
      ? `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`
      : `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()} – ${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  } else {
    title = `${WEEKDAYS_LONG[(cursor.getDay() + 6) % 7]}, ${MONTHS_SHORT[cursor.getMonth()]} ${cursor.getDate()}, ${cursor.getFullYear()}`;
  }

  return (
    <div className="card">
      <div className="card-head" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm" onClick={stepBack}><Icon name="chevron-left" size={14}/></button>
          <span className="strong" style={{ fontSize: 14, minWidth: 200, textAlign: 'center' }}>
            {title}
          </span>
          <button className="btn btn-sm" onClick={stepForward}><Icon name="chevron-right" size={14}/></button>
          <button className="btn btn-sm" onClick={goToday} style={{ marginLeft: 4 }}>
            <Icon name="calendar" size={12}/> Today
          </button>
        </div>

        {/* View-mode segmented control */}
        <div role="tablist" style={{
          display: 'inline-flex', border: '1px solid var(--border)',
          borderRadius: 6, overflow: 'hidden', background: 'var(--surface)',
        }}>
          {[
            ['month', 'Month'],
            ['week', 'Week'],
            ['day', 'Day'],
          ].map(([v, l], idx) => {
            const active = viewMode === v;
            return (
              <button
                key={v}
                role="tab"
                aria-selected={active}
                onClick={() => setViewMode(v)}
                style={{
                  padding: '5px 12px',
                  fontSize: 12, fontWeight: 500,
                  border: 'none',
                  borderLeft: idx > 0 ? '1px solid var(--border)' : 'none',
                  background: active ? 'var(--blue-soft)' : 'transparent',
                  color: active ? 'var(--blue)' : 'var(--text-2)',
                  cursor: 'pointer', font: 'inherit',
                }}
              >
                {l}
              </button>
            );
          })}
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

      {viewMode === 'month' && (
        <MonthView
          cursor={cursor}
          deadlineMap={deadlineMap}
          todayKey={todayKey}
          today={today}
          onSelect={handleSelect}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          cursor={cursor}
          deadlineMap={deadlineMap}
          todayKey={todayKey}
          today={today}
          onSelect={handleSelect}
        />
      )}
      {viewMode === 'day' && (
        <DayView
          cursor={cursor}
          deadlineMap={deadlineMap}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}

// ---------- month view ----------

function MonthView({ cursor, deadlineMap, todayKey, today, onSelect }) {
  const days = buildMonthGrid(cursor);
  return (
    <>
      <WeekdayHeader/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((day, i) => (
          <DayCell
            key={i}
            day={day}
            index={i}
            totalRows={days.length / 7}
            deadlineMap={deadlineMap}
            todayKey={todayKey}
            today={today}
            minHeight={96}
            onSelect={onSelect}
          />
        ))}
      </div>
    </>
  );
}

// ---------- week view ----------

function WeekView({ cursor, deadlineMap, todayKey, today, onSelect }) {
  const days = buildWeekGrid(cursor);
  return (
    <>
      <WeekdayHeader/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((day, i) => (
          <DayCell
            key={i}
            day={day}
            index={i}
            totalRows={1}
            deadlineMap={deadlineMap}
            todayKey={todayKey}
            today={today}
            minHeight={300}
            onSelect={onSelect}
          />
        ))}
      </div>
    </>
  );
}

// ---------- day view ----------

function DayView({ cursor, deadlineMap, onSelect }) {
  const dateKey = toDateKey(cursor);
  const items = deadlineMap[dateKey] || [];

  return (
    <div style={{ padding: 16 }}>
      <div className="text-faint fs-12 mb-3" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        {items.length} deadline{items.length !== 1 ? 's' : ''}
      </div>

      {items.length === 0 ? (
        <div className="text-faint fs-12" style={{ textAlign: 'center', padding: '32px 16px' }}>
          No deadlines on this day.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, j) => (
            <DeadlinePill
              key={j}
              item={item}
              size="lg"
              onClick={() => onSelect(item.orderId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- shared bits ----------

function WeekdayHeader() {
  return (
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
  );
}

function DayCell({ day, index, totalRows, deadlineMap, todayKey, today, minHeight, onSelect }) {
  const dateKey = day ? toDateKey(day) : null;
  const items = dateKey ? (deadlineMap[dateKey] || []) : [];
  const isToday = dateKey === todayKey;
  const isPast = day && day < today && !isToday;
  const col = index % 7;
  const isLastInRow = col === 6;
  const row = Math.floor(index / 7);
  const isLastRow = row === totalRows - 1;

  return (
    <div
      style={{
        minHeight,
        padding: '6px 7px',
        borderRight: !isLastInRow ? '1px solid var(--border)' : undefined,
        borderBottom: !isLastRow ? '1px solid var(--border)' : undefined,
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
            {items.map((item, j) => (
              <DeadlinePill
                key={j}
                item={item}
                onClick={() => onSelect(item.orderId)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export { DeadlineCalendar };
