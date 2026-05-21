// GW · Project Timeline — dual-track planned-vs-actual milestone chart per active assignment.

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Icon, StatusPill } from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import * as W from '../core/workflow.js';
import { QA_STATUS } from '../core/status.js';
import { ACTIVE_GW_ORDER_STATUSES } from '../core/selectors.js';
import EF from '../core/ef.js';

const D = EF;
const ACTIVE_STATUS_SET = new Set(ACTIVE_GW_ORDER_STATUSES);
const GUTTER_W = 280;
const BAR_W = 30;
const BAR_H = 8;
const PLANNED_Y = 26;
const ACTUAL_Y = 56;
const DATE_Y = 72;
const SVG_H = 80;
const ROW_PAD = 12;
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const HOVER_DELAY_MS = 150;
const MID_CONN_Y = (PLANNED_Y + ACTUAL_Y) / 2;

const MILESTONE_NAMES = {
  start: 'Order accepted',
  interim_1: 'Interim 1 (Zwischenstand 1)',
  interim_2: 'Interim 2 (Zwischenstand 2)',
  final_work: 'Final delivery',
  revision: 'Revision',
};

const MILESTONE_SHORT = {
  interim_1: 'Int. 1',
  interim_2: 'Int. 2',
  final_work: 'Final',
  revision: 'Rev.',
};

const QA_LABELS = {
  [QA_STATUS.PENDING]: 'pending',
  [QA_STATUS.PASSED]: 'passed',
  [QA_STATUS.FLAGGED]: 'flagged',
  [QA_STATUS.REVISION_REQUESTED]: 'revision requested',
  [QA_STATUS.AUTO_FORWARDED]: 'auto-forwarded',
  [QA_STATUS.ARCHIVED]: 'archived',
};

function toMs(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

function xPos(ms, tMin, span, width) {
  if (ms == null || span <= 0) return 0;
  return Math.max(0, Math.min(width, ((ms - tMin) / span) * width));
}

function fmtDayMonth(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtLongDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const wd = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const rest = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${wd} ${rest}, ${time}`;
}

function buildPlanned(order) {
  const pts = [];
  if (order.acceptedAt) {
    pts.push({ key: 'start', date: order.acceptedAt, stroke: 'var(--text-3)', kind: null, isFinal: false });
  }
  if (order.interimDeadline) {
    pts.push({ key: 'i1', date: order.interimDeadline, stroke: 'var(--amber)', kind: 'interim_1', isFinal: false });
  }
  if (order.interim2Deadline) {
    pts.push({ key: 'i2', date: order.interim2Deadline, stroke: 'var(--amber)', kind: 'interim_2', isFinal: false });
  }
  if (order.finalDeadline) {
    pts.push({ key: 'f', date: order.finalDeadline, stroke: 'var(--blue)', kind: 'final_work', isFinal: true });
  }
  return pts;
}

function pickSubmission(subs, kind) {
  const matches = subs.filter(s => s.kind === kind && s.submittedAt);
  if (!matches.length) return null;
  return matches.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))[0];
}

function buildActuals(derived) {
  const actuals = [];
  const i1 = pickSubmission(derived, 'interim_1');
  const i2 = pickSubmission(derived, 'interim_2');
  const fin = pickSubmission(derived, 'final_work');
  if (i1) actuals.push({ ...i1, kind: 'interim_1', isFinal: false, isRevision: false });
  if (i2) actuals.push({ ...i2, kind: 'interim_2', isFinal: false, isRevision: false });
  if (fin) actuals.push({ ...fin, kind: 'final_work', isFinal: true, isRevision: false });
  derived
    .filter(s => s.kind === 'revision' && s.submittedAt)
    .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
    .forEach(s => actuals.push({ ...s, kind: 'revision', isFinal: true, isRevision: true }));
  return actuals;
}

function deltaDays(plannedIso, actualIso) {
  const p = toMs(plannedIso);
  const a = toMs(actualIso);
  if (p == null || a == null) return null;
  return Math.round((a - p) / 86400000);
}

function deltaLabel(days) {
  if (days == null) return null;
  if (days === 0) return { text: 'On time', color: 'var(--text-3)' };
  if (days < 0) return { text: `${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} early`, color: 'var(--green)' };
  return { text: `${days} day${days !== 1 ? 's' : ''} late`, color: 'var(--red)' };
}

function lateStrokeWidth(days) {
  if (days == null || days <= 0) return 1.5;
  if (days <= 1) return 1.5;
  if (days <= 3) return 2;
  return 3;
}

function urgencyKey(order, derived) {
  const planned = buildPlanned(order);
  const unmet = [];
  for (const p of planned) {
    if (!p.kind) continue;
    const has = derived.some(s => s.kind === p.kind && s.submittedAt);
    if (!has && p.date) unmet.push(toMs(p.date));
  }
  if (!unmet.length) return Infinity;
  return Math.min(...unmet);
}

function monthTicks(tMin, tMax) {
  const ticks = [];
  const start = new Date(tMin);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(tMax);
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime() + 86400000) {
    ticks.push({ ms: cur.getTime(), label: `${MONTHS_SHORT[cur.getMonth()]} ${cur.getFullYear()}` });
    cur.setMonth(cur.getMonth() + 1);
  }
  return ticks;
}

function TimelineTooltip({ tip, onEnter, onLeave }) {
  if (!tip) return null;
  const above = tip.placeAbove !== false;
  return (
    <div
      role="tooltip"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      style={{
        position: 'fixed',
        left: tip.x,
        top: tip.y,
        transform: above ? 'translate(-50%, calc(-100% - 10px))' : 'translate(-50%, 10px)',
        zIndex: 9999,
        maxWidth: 280,
        padding: '10px 12px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        pointerEvents: 'auto',
        fontSize: 11.5,
        lineHeight: 1.45,
        color: 'var(--text)',
      }}
    >
      {tip.lines.map((line, i) => (
        <div
          key={i}
          style={{
            marginTop: i > 0 ? 4 : 0,
            color: line.color || 'var(--text-2)',
            fontWeight: line.strong ? 600 : 400,
          }}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
}

function buildMarkerTip({ planned, actual, kind, isPlanned, submission }) {
  const name = MILESTONE_NAMES[kind || 'start'] || kind;
  const lines = [{ text: name, strong: true, color: 'var(--text)' }];

  if (isPlanned) {
    lines.push({ text: `Deadline: ${fmtLongDateTime(planned?.date)}`, color: 'var(--text-2)' });
    return lines;
  }

  lines.push({ text: `Submitted: ${fmtLongDateTime(actual?.submittedAt)}`, color: 'var(--text-2)' });
  if (planned?.date && actual?.submittedAt) {
    const d = deltaLabel(deltaDays(planned.date, actual.submittedAt));
    if (d) lines.push({ text: d.text, color: d.color });
  }
  if (actual?.fileName) {
    lines.push({ text: actual.fileName, color: 'var(--text-3)' });
  }
  if (actual?.isRevision) {
    lines.push({
      text: `Revision round ${actual.round || 1} — submitted ${fmtLongDateTime(actual.submittedAt)}`,
      color: 'var(--text-2)',
    });
  }
  if (actual?.qaStatus && W.isQaReviewKind(actual.kind)) {
    lines.push({ text: `QA status: ${QA_LABELS[actual.qaStatus] || actual.qaStatus}`, color: 'var(--text-3)' });
  }
  return lines;
}

function buildConnectorTip(kind, plannedDate, actualDate, days) {
  const name = MILESTONE_NAMES[kind] || kind;
  const d = deltaLabel(days);
  const latePart = days > 0
    ? `submitted ${days} day${days !== 1 ? 's' : ''} late`
    : days === 0
    ? 'submitted on time'
    : `submitted ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} early`;
  return [
    { text: `${name} ${latePart}`, strong: true, color: 'var(--text)' },
    { text: `Planned ${fmtLongDateTime(plannedDate)} → actual ${fmtLongDateTime(actualDate)}`, color: d?.color || 'var(--text-2)' },
  ];
}

function TimelineRow({ order, derived, tMin, span, trackWidth, navigate, onHover, onHoverEnd }) {
  const svgRef = useRef(null);
  const planned = buildPlanned(order);
  const actuals = buildActuals(derived);
  const title = order.titleTBD
    ? <em className="text-faint">Title TBD — awaiting customer</em>
    : (order.title || '—');

  const showTip = useCallback((clientX, clientY, lines, placeAbove) => {
    onHover({ x: clientX, y: clientY, lines, placeAbove });
  }, [onHover]);

  const tipFromEvent = useCallback((e, lines) => {
    const rowRect = svgRef.current?.closest('[data-timeline-row]')?.getBoundingClientRect();
    const placeAbove = rowRect ? (e.clientY - rowRect.top) > (rowRect.height / 2) : true;
    showTip(e.clientX, e.clientY, lines, placeAbove);
  }, [showTip]);

  return (
    <div
      data-timeline-row
      className="flex"
      style={{
        borderTop: '1px solid var(--border)',
        cursor: 'pointer',
        background: 'var(--surface)',
      }}
      onClick={() => navigate('order-detail', { id: order.id })}
    >
      <div
        style={{
          width: GUTTER_W,
          flexShrink: 0,
          padding: `${ROW_PAD}px 12px`,
          borderRight: '1px solid var(--border)',
        }}
      >
        <div className="flex items-baseline gap-2 flex-wrap" style={{ marginBottom: 6 }}>
          <span className="mono strong fs-12">#{order.id}</span>
          <span style={{ transform: 'scale(0.82)', transformOrigin: 'left center', display: 'inline-flex' }}>
            <StatusPill status={order.status}/>
          </span>
        </div>
        <div
          className="fs-12"
          style={{
            color: 'var(--text-2)',
            marginBottom: 4,
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </div>
        <span className="text-faint fs-11">
          {D.WORK_TYPE_LABELS[order.workType] || order.workType}
          {order.pages ? ` · ${order.pages} pages` : ''}
        </span>
      </div>

      <div style={{ flex: 1, position: 'relative', minWidth: 0, padding: `${ROW_PAD}px 0` }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${trackWidth} ${SVG_H}`}
          width="100%"
          height={SVG_H}
          preserveAspectRatio="none"
          style={{ display: 'block', overflow: 'visible' }}
          onClick={e => e.stopPropagation()}
        >
          {/* planned track */}
          <line x1={0} y1={PLANNED_Y} x2={trackWidth} y2={PLANNED_Y} stroke="var(--border)" strokeWidth={1} opacity={0.7}/>
          {/* actual track */}
          <line x1={0} y1={ACTUAL_Y} x2={trackWidth} y2={ACTUAL_Y} stroke="var(--border)" strokeWidth={1} opacity={0.45}/>

          {/* connectors — render before bars so bars sit on top */}
          {planned.filter(p => p.kind).map(p => {
            const act = actuals.find(a => a.kind === p.kind);
            if (!act?.submittedAt) return null;
            const xP = xPos(toMs(p.date), tMin, span, trackWidth);
            const xA = xPos(toMs(act.submittedAt), tMin, span, trackWidth);
            const days = deltaDays(p.date, act.submittedAt);
            const late = days > 0;
            const col = late ? 'var(--red)' : 'var(--green)';
            const sw = lateStrokeWidth(days);
            const path = `M ${xP} ${PLANNED_Y} L ${xP} ${ACTUAL_Y} L ${xA} ${ACTUAL_Y}`;
            const midX = (xP + xA) / 2;
            return (
              <g key={`conn-${p.key}`}>
                <path
                  d={path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={10}
                  onMouseEnter={e => tipFromEvent(e, buildConnectorTip(p.kind, p.date, act.submittedAt, days))}
                  onMouseLeave={onHoverEnd}
                />
                <path d={path} fill="none" stroke={col} strokeWidth={sw} opacity={0.9}/>
                {late && (
                  <g transform={`translate(${midX}, ${MID_CONN_Y})`}>
                    <rect x={-16} y={-7} width={32} height={14} rx={3} fill="white" stroke="var(--red)" strokeWidth={1}/>
                    <text textAnchor="middle" y={3} fontSize={8} fontWeight={700} fill="var(--red)">+{days}d</text>
                  </g>
                )}
              </g>
            );
          })}

          {/* planned milestone bars */}
          {planned.map(p => {
            const x = xPos(toMs(p.date), tMin, span, trackWidth);
            const act = p.kind ? actuals.find(a => a.kind === p.kind) : null;
            const met = !!(p.kind && act);
            const lines = buildMarkerTip({
              planned: p,
              actual: act,
              kind: p.kind || 'start',
              isPlanned: true,
              submission: act,
            });

            if (!p.kind) {
              return (
                <g
                  key={`plan-${p.key}`}
                  onMouseEnter={e => tipFromEvent(e, lines)}
                  onMouseLeave={onHoverEnd}
                  style={{ cursor: 'default' }}
                >
                  <rect x={x - 12} y={PLANNED_Y - 14} width={24} height={28} fill="transparent"/>
                  <rect
                    x={x - 10}
                    y={PLANNED_Y - BAR_H / 2}
                    width={20}
                    height={BAR_H}
                    rx={3}
                    fill="var(--surface)"
                    stroke="var(--text-3)"
                    strokeWidth={1.5}
                  />
                </g>
              );
            }

            return (
              <g
                key={`plan-${p.key}`}
                onMouseEnter={e => tipFromEvent(e, lines)}
                onMouseLeave={onHoverEnd}
                style={{ cursor: 'default' }}
              >
                <rect x={x - BAR_W / 2 - 4} y={PLANNED_Y - BAR_H / 2 - 14} width={BAR_W + 8} height={BAR_H + 20} fill="transparent"/>
                <text
                  x={x}
                  y={PLANNED_Y - BAR_H / 2 - 3}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={600}
                  fill={p.stroke}
                  opacity={met ? 0.4 : 0.9}
                >
                  {MILESTONE_SHORT[p.kind] || p.kind}
                </text>
                <rect
                  x={x - BAR_W / 2}
                  y={PLANNED_Y - BAR_H / 2}
                  width={BAR_W}
                  height={BAR_H}
                  rx={3}
                  fill={met ? `color-mix(in oklab, ${p.stroke} 12%, var(--surface))` : 'transparent'}
                  stroke={p.stroke}
                  strokeWidth={2}
                  opacity={met ? 0.4 : 1}
                />
              </g>
            );
          })}

          {/* actual milestone bars */}
          {actuals.map((a, i) => {
            const x = xPos(toMs(a.submittedAt), tMin, span, trackWidth);
            const plan = a.isRevision ? null : planned.find(p => p.kind === a.kind);
            const fill = a.isFinal ? 'var(--blue)' : 'var(--amber)';
            const lines = buildMarkerTip({
              planned: plan,
              actual: a,
              kind: a.kind,
              isPlanned: false,
              submission: a,
            });
            return (
              <g
                key={`act-${a.id || i}`}
                onMouseEnter={e => tipFromEvent(e, lines)}
                onMouseLeave={onHoverEnd}
                style={{ cursor: 'default' }}
              >
                <rect x={x - BAR_W / 2 - 4} y={ACTUAL_Y - BAR_H / 2} width={BAR_W + 8} height={BAR_H + 20} fill="transparent"/>
                <rect
                  x={x - BAR_W / 2}
                  y={ACTUAL_Y - BAR_H / 2}
                  width={BAR_W}
                  height={BAR_H}
                  rx={3}
                  fill={fill}
                  stroke="var(--surface)"
                  strokeWidth={1.5}
                />
                {a.isRevision && (
                  <text x={x} y={ACTUAL_Y + 3} textAnchor="middle" fontSize={7} fontWeight={700} fill="white">
                    {a.round || 1}
                  </text>
                )}
                <text x={x} y={DATE_Y} textAnchor="middle" fontSize={9} fill="var(--text-3)" opacity={0.85}>
                  {fmtDayMonth(a.submittedAt)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function GWTimeline({ navigate, embedded = false }) {
  const trackRef = useRef(null);
  const [trackWidth, setTrackWidth] = useState(480);
  const [tip, setTip] = useState(null);
  const hideTimer = useRef(null);
  const today = useMemo(() => new Date(), []);

  const clearTip = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setTip(null), HOVER_DELAY_MS);
  }, []);

  const setTipNow = useCallback((next) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setTip(next);
  }, []);

  const keepTip = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
  }, []);

  const allOrders = EFHooks.useOrders({ gwId: D.GW_ME.id });
  const allSubmissions = EFHooks.useSubmissions();

  const { rows, tMin, tMax } = useMemo(() => {
    const orders = allOrders.filter(o => ACTIVE_STATUS_SET.has(o.status));
    const byOrder = new Map();
    allSubmissions.forEach(s => {
      const list = byOrder.get(s.orderId) || [];
      list.push(s);
      byOrder.set(s.orderId, list);
    });

    const rows = orders
      .map(order => ({
        order,
        derived: W.deriveSubmissions(order, byOrder.get(order.id) || []),
      }))
      .sort((a, b) => urgencyKey(a.order, a.derived) - urgencyKey(b.order, b.derived));

    const fallbackMin = today.getTime() - 30 * 86400000;
    let minT = fallbackMin;
    let maxT = today.getTime();

    rows.forEach(({ order, derived }) => {
      const start = toMs(order.acceptedAt);
      if (start != null) minT = Math.min(minT, start);
      const fin = toMs(order.finalDeadline);
      if (fin != null) maxT = Math.max(maxT, fin);
      derived.forEach(s => {
        const t = toMs(s.submittedAt);
        if (t != null) maxT = Math.max(maxT, t);
      });
    });

    maxT = Math.max(maxT, today.getTime());
    const span = maxT - minT;
    const pad = span * 0.05;
    return { rows, tMin: minT - pad, tMax: maxT + pad };
  }, [allOrders, allSubmissions, today]);

  const span = tMax - tMin;
  const ticks = useMemo(() => monthTicks(tMin, tMax), [tMin, tMax]);
  const todayX = xPos(today.getTime(), tMin, span, trackWidth);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width;
      if (w && w > 0) setTrackWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
  }, []);

  return (
    <div className={embedded ? undefined : 'page'}>
      {!embedded && (
        <div className="page-header">
          <div>
            <h1 className="page-title">Project Timeline</h1>
            <div className="page-subtitle">
              {rows.length} active assignment{rows.length !== 1 ? 's' : ''} · planned vs actual
            </div>
          </div>
          <div className="page-actions">
            <button className="btn btn-primary" onClick={() => navigate('gw-active')}>
              <Icon name="briefcase" size={14}/> My Assignments
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-head flex-col gap-2" style={{ alignItems: 'flex-start' }}>
          <div className="flex items-center gap-4 fs-11 text-faint flex-wrap">
            <span className="flex items-center gap-2">
              <span style={{
                width: 20, height: 8, borderRadius: 3, border: '2px solid var(--amber)',
                background: 'transparent', display: 'inline-block',
              }}/>
              Planned interim
            </span>
            <span className="flex items-center gap-2">
              <span style={{
                width: 20, height: 8, borderRadius: 3, border: '2px solid var(--blue)',
                background: 'transparent', display: 'inline-block',
              }}/>
              Planned final
            </span>
            <span className="flex items-center gap-2">
              <span style={{
                width: 20, height: 8, borderRadius: 3, background: 'var(--amber)',
                display: 'inline-block',
              }}/>
              Actual interim
            </span>
            <span className="flex items-center gap-2">
              <span style={{
                width: 20, height: 8, borderRadius: 3, background: 'var(--blue)',
                display: 'inline-block',
              }}/>
              Actual final
            </span>
          </div>
          <div className="flex items-center gap-4 fs-11 text-faint flex-wrap">
            <span className="flex items-center gap-2">
              <span style={{ width: 16, height: 2, background: 'var(--green)', display: 'inline-block' }}/>
              On time / early
            </span>
            <span className="flex items-center gap-2">
              <span style={{ width: 16, height: 2, background: 'var(--red)', display: 'inline-block' }}/>
              Late (+Nd badge)
            </span>
            <span className="flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
              Hollow bar = deadline · Filled bar = submitted · Label above = milestone name
            </span>
          </div>
        </div>

        <div className="flex" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', position: 'relative' }}>
          <div style={{ width: GUTTER_W, flexShrink: 0, borderRight: '1px solid var(--border)' }}/>
          <div ref={trackRef} style={{ flex: 1, position: 'relative', height: 32, minWidth: 0 }}>
            {ticks.map((t, i) => (
              <span
                key={i}
                className="fs-11 text-faint"
                style={{
                  position: 'absolute',
                  left: xPos(t.ms, tMin, span, trackWidth),
                  top: 8,
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </span>
            ))}
            <span
              style={{
                position: 'absolute',
                left: todayX,
                top: 4,
                transform: 'translateX(-50%)',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 10,
                background: 'var(--blue)',
                color: 'white',
                whiteSpace: 'nowrap',
                zIndex: 4,
              }}
            >
              Today
            </span>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          {/* future zone tint */}
          <div
            style={{
              position: 'absolute',
              left: GUTTER_W + todayX,
              top: 0,
              right: 0,
              bottom: 0,
              background: 'color-mix(in oklab, var(--blue) 3%, transparent)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          {/* today line */}
          <div
            style={{
              position: 'absolute',
              left: GUTTER_W + todayX,
              top: 0,
              bottom: 0,
              width: 0,
              borderLeft: '2px dashed var(--blue)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />

          {rows.length === 0 ? (
            <div className="card-pad" style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--text-3)' }}>
              <Icon name="git-branch" size={28} style={{ marginBottom: 10, opacity: 0.4 }}/>
              <div className="fs-13 strong" style={{ marginBottom: 4 }}>No active assignments</div>
              <div className="fs-12">Accepted work with open milestones will appear here.</div>
            </div>
          ) : (
            rows.map(({ order, derived }) => (
              <TimelineRow
                key={order.id}
                order={order}
                derived={derived}
                tMin={tMin}
                span={span}
                trackWidth={trackWidth}
                navigate={navigate}
                onHover={setTipNow}
                onHoverEnd={clearTip}
              />
            ))
          )}
        </div>
      </div>

      <TimelineTooltip tip={tip} onEnter={keepTip} onLeave={clearTip}/>
    </div>
  );
}

export { GWTimeline };
