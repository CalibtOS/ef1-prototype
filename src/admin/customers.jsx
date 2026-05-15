// Admin · Customers list (CustomerDetail lives in customer-detail.jsx).

// ============ CUSTOMERS (minimal) ============
import React, { useState as useStateA, useEffect as useEffectA, useMemo as useMemoA } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import * as W from '../core/workflow.js';
import EF from '../core/ef.js';
const D = EF;

function CustomersPage({ navigate }) {
  const [search, setSearch] = useStateA('');
  const [filter, setFilter] = useStateA('all');

  const liveOrders = D.liveOrders();
  const customersWithStats = D.CUSTOMERS.map(c => {
    const orders = liveOrders.filter(o => o.customerId === c.id);
    const openBalance = orders.reduce((s, o) => s + (W.canShowReceivable(o) ? (o.outstandingEur || 0) : 0), 0);
    const hasDispute = orders.some(o => o.disputeOpen);
    const lastOrder = orders.sort((a,b) => (b.acceptedAt||'').localeCompare(a.acceptedAt||''))[0];
    return { ...c, orderCount: orders.length, openBalance, hasDispute, lastOrderDate: lastOrder?.acceptedAt };
  });

  const filtered = customersWithStats.filter(c => {
    if (filter === 'open' && c.openBalance === 0) return false;
    if (filter === 'vip' && !c.tags?.includes('VIP')) return false;
    if (filter === 'dispute' && !c.hasDispute) return false;
    if (search && !((c.name + ' ' + c.email).toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const totalOpen = customersWithStats.reduce((s,c) => s + c.openBalance, 0);
  const vipCount = customersWithStats.filter(c => c.tags?.includes('VIP')).length;
  const disputeCount = customersWithStats.filter(c => c.hasDispute).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Customers']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Customers</h1>
          <div className="page-subtitle">{D.CUSTOMERS.length} customers · synced from Pipedrive</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">Open balance owed</div>
          <div className="mono strong" style={{ fontSize: 22, color: 'var(--red)', marginTop: 4 }}>{U.EUR(totalOpen)}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">VIP customers</div>
          <div className="mono strong" style={{ fontSize: 22, marginTop: 4 }}>{vipCount}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div className="text-faint fs-11">In dispute</div>
          <div className="mono strong" style={{ fontSize: 22, color: disputeCount ? 'var(--amber)' : 'var(--text)', marginTop: 4 }}>{disputeCount}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
        <div className="topbar-search" style={{ width: 280 }}>
          <Icon name="search" size={14} className="text-faint topbar-search-icon" aria-hidden/>
          <input type="search" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search customers"/>
        </div>
        {[['all','All'],['open','Has open balance'],['vip','VIP'],['dispute','In dispute']].map(([v,l]) => (
          <button key={v} className={`chip ${filter===v?'active':''}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
        <span style={{ flex: 1 }}/>
        <span className="text-faint fs-12">{filtered.length} of {D.CUSTOMERS.length}</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Customer</th>
              <th className="num">Orders</th>
              <th className="num">Lifetime</th>
              <th className="num">Open balance</th>
              <th>Last order</th>
              <th>Lead source</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate('customer-detail', { id: c.id })}>
                <td>
                  <div className="flex items-center gap-2">
                    <Avatar initials={c.initials} size={28}/>
                    <div className="flex-col" style={{ lineHeight: 1.25 }}>
                      <div className="flex items-center gap-1">
                        <span className="strong fs-12">{c.name}</span>
                        {c.tags?.includes('VIP') && <span className="pill pill-yellow" style={{ fontSize: 9 }}>VIP</span>}
                        {c.hasDispute && <span className="pill pill-orange" style={{ fontSize: 9 }}>Dispute</span>}
                      </div>
                      <span className="text-faint fs-11 mono">{c.email}</span>
                    </div>
                  </div>
                </td>
                <td className="num mono">{c.orderCount}</td>
                <td className="num mono">{U.EUR(c.ltv || 0)}</td>
                <td className="num mono" style={{ color: c.openBalance > 0 ? 'var(--red)' : 'var(--text-3)' }}>
                  {c.openBalance > 0 ? U.EUR(c.openBalance) : '—'}
                </td>
                <td className="text-faint fs-11">{c.lastOrderDate ? U.fmtDate(c.lastOrderDate) : '—'}</td>
                <td className="text-muted fs-11">{c.leadSource}</td>
                <td className="num">
                  {c.openBalance > 0 && <button type="button" className="btn btn-sm" title="Send dunning" onClick={e => e.stopPropagation()}><Icon name="mail" size={12}/></button>}
                  <button type="button" className="btn btn-sm" aria-label="Open customer 360" onClick={e => { e.stopPropagation(); navigate('customer-detail', { id: c.id }); }}><Icon name="chevron-right" size={12}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { CustomersPage };
