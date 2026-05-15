// Admin · Sales pipeline kanban — Pipedrive mirror.

// ============ PIPELINE (Pipedrive kanban mirror) ============
import React, { useState as useStateA, useEffect as useEffectA, useMemo as useMemoA } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import * as W from '../core/workflow.js';
import EF from '../core/ef.js';
const D = EF;

function PipelineKanban({ navigate }) {
  const stageDefs = [
    { id: 'anfrage', label: 'Anfrage', sub: 'Inquiry', color: 'slate' },
    { id: 'qualifiziert', label: 'Qualifiziert', sub: 'Qualified for Ghostwriting', color: 'blue' },
    { id: 'rueckmeldung', label: 'Proposal', sub: 'Offer sent', color: 'amber' },
    { id: 'rechnung', label: 'Rechnung angefordert', sub: 'Invoice requested', color: 'orange' },
    { id: 'won', label: 'Won', sub: 'Closed', color: 'green' },
    { id: 'lost', label: 'Lost', sub: 'Lost / Storno', color: 'red' },
  ];
  const orderToStage = (o) => {
    if (o.status === 'cancelled' || o.status === 'bye') return 'lost';
    if (['lead'].includes(o.status)) return 'anfrage';
    if (['qualified'].includes(o.status)) return 'qualifiziert';
    if (['offer_sent'].includes(o.status)) return 'rueckmeldung';
    if (['invoice_sent'].includes(o.status)) return 'rechnung';
    return 'won';
  };
  const synthLeads = [
    { id: 9012, customerName: 'Hannes Reuter', customerInitials: 'HR', workType: 'bachelorarbeit', field: 'BWL', pages: 40, grossEur: 2360, ageHours: 2, lastTouch: '2026-05-07T13:14:00', stage: 'anfrage', leadSource: 'ig' },
    { id: 9015, customerName: 'Sabine Vogt', customerInitials: 'SV', workType: 'masterarbeit', field: 'Wirtschaftspsychologie', pages: 60, grossEur: 4140, ageHours: 5, lastTouch: '2026-05-07T10:02:00', stage: 'anfrage', leadSource: 'ef1' },
    { id: 9020, customerName: 'Tim Albrecht', customerInitials: 'TA', workType: 'hausarbeit', field: 'Marketing', pages: 14, grossEur: 686, ageHours: 12, lastTouch: '2026-05-07T03:40:00', stage: 'anfrage', leadSource: 'ws1' },
    { id: 9028, customerName: 'Olivia Stein', customerInitials: 'OS', workType: 'bachelorarbeit', field: 'Soziologie', pages: 38, grossEur: 2242, ageHours: 26, lastTouch: '2026-05-06T14:00:00', stage: 'qualifiziert', leadSource: 'ef1' },
    { id: 9031, customerName: 'Jonas Eberle', customerInitials: 'JE', workType: 'masterarbeit', field: 'Informatik', pages: 70, grossEur: 4830, ageHours: 38, lastTouch: '2026-05-06T01:18:00', stage: 'qualifiziert', leadSource: 'b1' },
    { id: 9035, customerName: 'Karen Pohl', customerInitials: 'KP', workType: 'hausarbeit', field: 'Personal', pages: 20, grossEur: 980, ageHours: 50, lastTouch: '2026-05-05T13:30:00', stage: 'rueckmeldung', leadSource: 'ig' },
    { id: 9039, customerName: 'Yusuf Demir', customerInitials: 'YD', workType: 'expose', field: 'VWL', pages: 8, grossEur: 480, ageHours: 70, lastTouch: '2026-05-04T17:20:00', stage: 'rueckmeldung', leadSource: 'referral' },
    { id: 9042, customerName: 'Greta Lindner', customerInitials: 'GL', workType: 'bachelorarbeit', field: 'Pädagogik', pages: 35, grossEur: 2065, ageHours: 92, lastTouch: '2026-05-03T19:00:00', stage: 'rechnung', leadSource: 'ef1' },
  ];
  const realOrders = D.liveOrders().map(o => ({
    id: o.id,
    customerName: D.customer(o.customerId)?.name,
    customerInitials: D.customer(o.customerId)?.initials || '··',
    workType: o.workType, field: o.field, pages: o.pages,
    grossEur: o.grossEur, lastTouch: o.acceptedAt, stage: orderToStage(o),
    leadSource: o.leadSource, status: o.status, real: true,
  }));
  const cards = [...synthLeads, ...realOrders];
  const byStage = stageDefs.reduce((acc, s) => { acc[s.id] = cards.filter(c => c.stage === s.id); return acc; }, {});
  const stageTotal = (s) => (s === 'anfrage' || s === 'qualifiziert')
    ? null
    : byStage[s].reduce((sum, c) => sum + (c.grossEur || 0), 0);
  const totalPipeline = cards
    .filter(c => c.stage !== 'lost' && c.stage !== 'won' && c.stage !== 'anfrage' && c.stage !== 'qualifiziert')
    .reduce((s,c) => s + (c.grossEur||0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Pipeline']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Pipedrive Pipeline</h1>
          <div className="page-subtitle">{cards.length} deals · open pipeline value <span className="mono strong" style={{ color: 'var(--text)' }}>{U.EUR(totalPipeline)}</span> · sync {U.relTime('2026-05-07T14:18:00')}</div>
        </div>
        <div className="page-actions">
          <NotReady className="btn" feature="filters-advanced"><Icon name="filter" size={14}/> Filters</NotReady>
          <NotReady className="btn" feature="pipedrive-open"><Icon name="external-link" size={14}/> Open in Pipedrive</NotReady>
          <NotReady className="btn btn-primary" feature="pipedrive-new-deal"><Icon name="plus" size={14}/> New deal</NotReady>
        </div>
      </div>

      <div className="banner warn mb-3">
        <Icon name="alert-triangle" size={14}/>
        <span><strong>Pipedrive subscriber cap:</strong> 4,159 / 5,000 used (83%). Clean up Lost deals before next campaign or upgrade tier.</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stageDefs.length}, minmax(220px, 1fr))`, gap: 12, alignItems: 'flex-start' }}>
        {stageDefs.map(s => (
          <div key={s.id} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: 10, minHeight: 200 }}>
            <div className="flex items-center justify-between mb-2" style={{ padding: '0 4px' }}>
              <div className="flex-col" style={{ lineHeight: 1.15 }}>
                <span className="strong fs-12">{s.label}</span>
                <span className="text-faint fs-11">{s.sub}</span>
              </div>
              <span className={`pill pill-${s.color}`}>{byStage[s.id].length}</span>
            </div>
            <div className="text-faint fs-11 mono mb-2" style={{ padding: '0 4px' }}>{stageTotal(s.id) == null ? 'No money shown' : U.EUR(stageTotal(s.id))}</div>
            <div className="flex-col gap-2">
              {byStage[s.id].slice(0, 12).map(c => (
                <div key={c.id} className="card" style={{ padding: 10, cursor: 'pointer' }} onClick={() => c.real && navigate('order-detail', { id: c.id })}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="mono fs-11 text-faint">#{c.id}</span>
                    <span className="text-faint fs-11">{c.leadSource}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar initials={c.customerInitials} size={20}/>
                    <span className="strong fs-12" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.customerName}</span>
                  </div>
                  <div className="text-muted fs-11" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {D.WORK_TYPE_LABELS[c.workType] || c.workType} · {c.field}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="mono fs-11" style={{ color: 'var(--text)' }}>{(c.stage === 'anfrage' || c.stage === 'qualifiziert' || (c.real && !W.canShowMoney(c.status))) ? '—' : U.EUR(c.grossEur)}</span>
                    {c.ageHours != null && <span className="text-faint fs-11">{c.ageHours < 24 ? c.ageHours + 'h' : Math.round(c.ageHours/24) + 'd'}</span>}
                  </div>
                </div>
              ))}
              {byStage[s.id].length > 12 && (
                <NotReady className="btn btn-ghost btn-sm" feature="pipeline-load-more" style={{ justifyContent: 'center' }}>+{byStage[s.id].length - 12} more</NotReady>
              )}
              {byStage[s.id].length === 0 && (
                <div className="text-faint fs-11" style={{ padding: 12, textAlign: 'center' }}>No deals</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
window.PipelineKanban = PipelineKanban;
