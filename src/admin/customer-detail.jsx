// Admin · Customer detail — orders, LTV, dispute history.

// ====================================================================
import React, { useState, useEffect, useMemo } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import * as W from '../core/workflow.js';
import * as EFHooks from '../core/hooks.js';
import EF from '../core/ef.js';
const D = EF;

function CustomerDetail({ customerId, navigate }) {
  const c = D.customer(customerId);
  const liveOrders = EFHooks.useOrders({ customerId });
  if (!c) return <div className="page">Customer not found.</div>;
  const orders = liveOrders
    .filter(o => o.customerId === customerId)
    .sort((a, b) => (b.acceptedAt || '').localeCompare(a.acceptedAt || ''));
  const ltv = orders.reduce((s, o) => s + (o.paidEur || 0), 0);
  const open = orders.reduce((s, o) => s + (W.canShowReceivable(o) ? (o.outstandingEur || 0) : 0), 0);
  const inflight = orders.filter(o => !['completed', 'cancelled', 'bye'].includes(o.status)).length;

  const timeline = orders.flatMap(o => ([
    o.acceptedAt && { kind: 'order', t: o.acceptedAt, text: `Order #${o.id} · ${D.WORK_TYPE_LABELS[o.workType]}${W.canShowMoney(o) ? ' · ' + U.EUR(o.grossEur) : ''}`, icon: 'package' },
    ...(o.installments || []).filter(i => i.status === 'paid').map(i => ({ kind: 'pay', t: i.date, text: `Installment ${i.n}/${o.installments.length} paid · ${U.EUR(i.amt)} · ${(i.method || '').replace('stripe_', 'Stripe ').replace('bank_transfer_sepa', 'SEPA').replace('_', ' ')} · #${o.id}`, icon: 'check-circle' })),
  ])).filter(Boolean).sort((a, b) => (b.t || '').localeCompare(a.t || '')).slice(0, 10);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Customers', c.name]}/>
          <h1 className="page-title" style={{ marginTop: 6, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Avatar initials={c.initials} size={36} tone="blue"/>
            <span>{c.name}</span>
            {c.tags?.includes('VIP') && <span className="pill pill-yellow">VIP</span>}
            {orders.some(o => o.disputeOpen) && <span className="pill pill-orange">Dispute open</span>}
          </h1>
          <div className="page-subtitle"><span className="mono">{c.email}</span> · <span className="mono">{c.phone}</span> · {c.country} · lead via {c.leadSource}</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('customers')}><Icon name="chevron-left" size={14}/> Back</button>
          <NotReady className="btn" feature="pipedrive-open"><Icon name="external-link" size={14}/> Open in Pipedrive</NotReady>
          <button type="button" className="btn btn-primary" onClick={() => navigate('order-new')}><Icon name="plus" size={14}/> New order for this customer</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div className="flex-col gap-3">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div className="card" style={{ padding: 14 }}><div className="text-faint fs-11">Lifetime value</div><div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{U.EUR(ltv)}</div></div>
            <div className="card" style={{ padding: 14 }}><div className="text-faint fs-11">Orders</div><div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{orders.length}</div></div>
            <div className="card" style={{ padding: 14, border: open > 0 ? '1px solid color-mix(in oklab, var(--red) 30%, var(--border))' : undefined }}><div className="text-faint fs-11">Open balance</div><div className="mono strong" style={{ fontSize: 22, color: open > 0 ? 'var(--red)' : 'var(--text)', marginTop: 4 }}>{U.EUR(open)}</div></div>
            <div className="card" style={{ padding: 14 }}><div className="text-faint fs-11">In-flight orders</div><div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{inflight}</div></div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">Order history ({orders.length})</div>
              <span className="text-faint fs-11">click row → order detail</span>
            </div>
            <div className="card-pad" style={{ padding: 0 }}>
              <table className="tbl" style={{ fontSize: 12 }}>
                <thead><tr><th>ID</th><th>Status</th><th>Type</th><th>Title</th><th className="num">Gross</th><th className="num">Outstanding</th><th>Final deadline</th></tr></thead>
                <tbody>
                  {orders.map(o => {
                    const showMoney = W.canShowMoney(o);
                    const showReceivable = W.canShowReceivable(o);
                    return (
                    <tr key={o.id} onClick={() => navigate('order-detail', { id: o.id })} style={{ cursor: 'pointer' }}>
                      <td className="mono"><strong>#{o.id}</strong></td>
                      <td><StatusPill status={o.status} order={o}/></td>
                      <td className="text-muted">{D.WORK_TYPE_LABELS[o.workType]}</td>
                      <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.titleTBD ? <em className="text-faint">folgt</em> : o.title}</td>
                      <td className="num mono">{showMoney ? U.EUR(o.grossEur) : <span className="text-faint fs-11">Hidden until proposal</span>}</td>
                      <td className="num mono">{!showMoney ? <span className="text-faint">—</span> : !showReceivable ? <span className="text-faint fs-11">Awaiting acceptance</span> : (o.outstandingEur > 0 ? <span style={{ color: 'var(--red)' }}>{U.EUR(o.outstandingEur)}</span> : <span className="text-faint">€0</span>)}</td>
                      <td className="mono fs-11">{o.finalDeadline ? U.fmtDate(o.finalDeadline) : '—'}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Activity timeline</div><span className="text-faint fs-11">last 10 events</span></div>
            <div className="card-pad">
              <div className="timeline">
                {timeline.map((e, i) => (
                  <div key={i} className="timeline-item">
                    <div className={`timeline-dot ${e.kind === 'pay' ? 'green' : 'blue'}`}><Icon name={e.icon} size={10}/></div>
                    <div className="timeline-content">
                      <div className="timeline-title">{e.text}</div>
                      <div className="timeline-meta mono">{U.fmtDate(e.t)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-col gap-3">
          <div className="card">
            <div className="card-head"><div className="card-title">Pipedrive sync</div><span className="pill pill-green"><Icon name="check" size={10}/> Live</span></div>
            <div className="card-pad fs-12">
              <div className="kv">
                <div className="kv-row"><dt>Pipedrive person</dt><dd className="mono">#PE-{customerId}</dd></div>
                <div className="kv-row"><dt>Marketing status</dt><dd><span className="pill pill-green" style={{ fontSize: 10 }}>subscribed</span></dd></div>
                <div className="kv-row"><dt>Last sync</dt><dd className="text-faint">{U.relTime('2026-05-07T13:42:00')}</dd></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Tags</div></div>
            <div className="card-pad">
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {(c.tags || []).map(t => <span key={t} className="pill pill-blue">{t}</span>)}
                {!c.tags?.length && <span className="text-faint fs-12">No tags</span>}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-head"><div className="card-title">Quick actions</div></div>
            <div className="card-pad flex-col gap-2">
              <button type="button" className="btn btn-sm" onClick={() => navigate('inbox')}><Icon name="message-square" size={12}/> Open inbox thread</button>
              <button type="button" className="btn btn-sm" onClick={() => navigate('order-new')}><Icon name="plus" size={12}/> Create new order</button>
              <NotReady className="btn btn-sm" label="Send dunning email"><Icon name="mail" size={12}/> Send dunning</NotReady>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CustomerDetail };
