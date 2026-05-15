// Admin · Reports — revenue, GW honoraria ledger, KPI widgets.

// ============ REPORTS (minimal — 3 widgets) ============
import React, { useState, useEffect, useMemo } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import EF from '../core/ef.js';
const D = EF;

function ReportsPage({ navigate }) {
  const [period, setPeriod] = useState('apr2026');
  const periods = [
    { id: 'apr2026', label: 'April 2026' },
    { id: 'mar2026', label: 'March 2026' },
    { id: 'q1_2026', label: 'Q1 2026' },
    { id: 'ytd', label: 'YTD 2026' },
  ];

  const orders = D.liveOrders();
  const completed = orders.filter(o => o.status === 'completed');
  const grossSum = orders.reduce((s, o) => s + (o.grossEur || 0), 0);
  const honorSum = orders.reduce((s, o) => s + (o.netHonorarium || 0), 0);
  const vatSum = orders.reduce((s, o) => s + ((o.grossEur || 0) * 0.07 / 1.07), 0);
  const netSum = grossSum - vatSum;
  const margin = netSum - honorSum;

  const honorarLedger = orders.filter(o => o.gwId && o.netHonorarium > 0).slice(0, 8).map(o => ({
    orderId: o.id,
    gw: D.gw(o.gwId)?.name,
    gwInitials: D.gw(o.gwId)?.initials,
    honorEur: o.netHonorarium,
    rate: o.rate,
    status: o.gwPaymentStatus,
    date: o.acceptedAt,
  }));

  const leadSources = [
    { id: 'ef1', label: 'efactory1.de (org)', leads: 142, won: 28, revenue: 16240 },
    { id: 'ig', label: 'Instagram', leads: 86, won: 14, revenue: 9420 },
    { id: 'b1', label: 'Backlink network', leads: 54, won: 11, revenue: 18620 },
    { id: 'ws1', label: 'WhatsApp inbound', leads: 38, won: 9, revenue: 7240 },
    { id: 'sp1', label: 'Sponsored search', leads: 32, won: 5, revenue: 4180 },
    { id: 'referral', label: 'Customer referral', leads: 18, won: 8, revenue: 8920 },
    { id: 'ebay', label: 'Kleinanzeigen', leads: 14, won: 2, revenue: 1862 },
    { id: 'ac', label: 'Academic forums', leads: 9, won: 3, revenue: 3245 },
  ];
  const maxRevenue = Math.max(...leadSources.map(l => l.revenue));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Reports']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Reports</h1>
          <div className="page-subtitle">Operational, financial and compliance reports · all values net of VAT 7% unless noted</div>
        </div>
        <div className="page-actions">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="btn" style={{ paddingRight: 24 }}>
            {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <NotReady className="btn" feature="export-bundle"><Icon name="download" size={14}/> Export bundle</NotReady>
        </div>
      </div>

      {/* P&L summary */}
      <div className="card mb-3">
        <div className="card-head"><div className="card-title">Monthly P&L · {periods.find(p=>p.id===period)?.label}</div><span className="text-faint fs-11">computed from {orders.length} orders</span></div>
        <div className="card-pad">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[
              { label: 'Gross revenue', val: grossSum, sub: 'incl. VAT', tone: 'text' },
              { label: 'VAT 7% (collected)', val: vatSum, sub: 'remit to Finanzamt', tone: 'muted' },
              { label: 'Net revenue', val: netSum, sub: 'after VAT', tone: 'text' },
              { label: 'GW honorarium', val: honorSum, sub: '−paid out', tone: 'red' },
              { label: 'Margin (Berat)', val: margin, sub: `${((margin/netSum)*100).toFixed(1)}% of net`, tone: 'green' },
            ].map((k, i) => (
              <div key={i} style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8 }}>
                <div className="text-faint fs-11">{k.label}</div>
                <div className="mono strong" style={{ fontSize: 18, marginTop: 4, color: k.tone === 'green' ? 'var(--green)' : k.tone === 'red' ? 'var(--red)' : k.tone === 'muted' ? 'var(--text-2)' : 'var(--text)' }}>
                  {U.EUR(k.val)}
                </div>
                <div className="text-faint fs-11 mt-1">{k.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
        {/* GW Honorarium ledger */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">GW Honorarium ledger</div>
            <NotReady className="btn btn-sm" feature="export-csv" label="GW Honorarium CSV"><Icon name="download" size={12}/> CSV</NotReady>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Order</th><th>Ghostwriter</th><th className="num">Rate</th><th className="num">Honorar</th><th>Status</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {honorarLedger.map(r => (
                  <tr key={r.orderId}>
                    <td className="mono">#{r.orderId}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar initials={r.gwInitials} size={22}/>
                        <span className="fs-12">{r.gw}</span>
                      </div>
                    </td>
                    <td className="num mono">{Math.round((r.rate||0)*100)}%</td>
                    <td className="num mono">{U.EUR(r.honorEur)}</td>
                    <td>
                      {r.status === 'paid' && <span className="pill pill-green">Paid</span>}
                      {r.status === 'invoice_received' && <span className="pill pill-amber">Awaiting Friday</span>}
                      {r.status === 'work_in_progress' && <span className="pill pill-slate">In progress</span>}
                      {r.status === 'no_payment_self_assigned' && <span className="pill pill-blue">Self</span>}
                    </td>
                    <td className="mono fs-11 text-muted">{U.fmtDate(r.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card-pad flex justify-between" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-muted fs-12">{honorarLedger.length} of {orders.filter(o=>o.gwId).length} entries shown</span>
            <span className="mono strong">Total {U.EUR(honorarLedger.reduce((s,r) => s + r.honorEur, 0))}</span>
          </div>
        </div>

        {/* VAT report */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">VAT 7% report</div>
            <span className="pill pill-amber">due 10.06.2026</span>
          </div>
          <div className="card-pad flex-col gap-3">
            <div className="kv">
              <div className="kv-row"><dt>Gross collected (Apr)</dt><dd className="mono">{U.EUR(grossSum)}</dd></div>
              <div className="kv-row"><dt>Net base</dt><dd className="mono">{U.EUR(netSum)}</dd></div>
              <div className="kv-row" style={{ borderTop: '1px dashed var(--border)', paddingTop: 8 }}>
                <dt><strong>VAT to remit (7%)</strong></dt><dd className="mono strong" style={{ color: 'var(--red)' }}>{U.EUR(vatSum)}</dd>
              </div>
            </div>
            <div className="banner info" style={{ fontSize: 11.5 }}>
              <Icon name="zap" size={12}/>
              <span>Auto-export to Sevdesk on the 1st of each month. ELSTER filing handled by Steuerberater.</span>
            </div>
            <NotReady className="btn" feature="ustva-preview"><Icon name="download" size={14}/> Download UStVA preview</NotReady>
          </div>
        </div>
      </div>

      {/* Lead source ROI */}
      <div className="card mt-3">
        <div className="card-head"><div className="card-title">Lead source ROI</div><span className="text-faint fs-11">last 30 days · revenue € net</span></div>
        <div className="card-pad flex-col gap-2">
          {leadSources.map(l => (
            <div key={l.id} className="flex items-center gap-3">
              <div style={{ width: 160 }} className="fs-12">{l.label}</div>
              <div style={{ flex: 1, position: 'relative', height: 22, background: 'var(--surface-2)', borderRadius: 4 }}>
                <div style={{ width: `${(l.revenue / maxRevenue) * 100}%`, height: '100%', background: 'var(--blue)', borderRadius: 4, transition: 'width .3s' }}/>
                <span className="mono fs-11" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text)', mixBlendMode: 'difference', filter: 'invert(1)' }}>{U.EUR(l.revenue)}</span>
              </div>
              <div style={{ width: 110 }} className="text-faint fs-11 mono">{l.won}/{l.leads} won · {Math.round((l.won/l.leads)*100)}%</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

export { ReportsPage };
