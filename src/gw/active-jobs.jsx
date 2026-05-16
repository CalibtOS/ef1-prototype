// GW · Active Jobs — assignments-in-progress view with deadlines and submissions.

// ============ GW ACTIVE JOBS ============
import React, { useState, useEffect, useMemo } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import * as EFHooks from '../core/hooks.js';
import EF from '../core/ef.js';
import { DeadlineCalendar } from '../core/deadline-calendar.jsx';
const D = EF;

function GWActiveJobs({ navigate, initialView = 'list' }) {
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState(initialView === 'calendar' ? 'calendar' : 'list');
  const [search, setSearch] = useState('');

  // The list and the detail route must read the same live order source.
  const realMine = EFHooks.useOrders({ gwId: D.GW_ME.id });

  // Augment real with derived stage info
  const realAugmented = realMine.map(o => {
    const stage = {
      interim1: o.interimDeadline ? (['interim_submitted','under_customer_review','revision_required','final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status) ? 'done' : 'pending') : null,
      interim2: o.interim2Deadline ? (['final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status) ? 'done' : 'pending') : null,
      final: ['final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status) ? 'done' : 'pending',
    };
    return { ...o, stage };
  });

  const all = realAugmented.sort((a,b) => {
    // Pending approval first, then by deadline ascending
    if (a.status === 'claimed_pending_approval' && b.status !== 'claimed_pending_approval') return -1;
    if (b.status === 'claimed_pending_approval' && a.status !== 'claimed_pending_approval') return 1;
    return new Date(a.finalDeadline || '2099-01-01') - new Date(b.finalDeadline || '2099-01-01');
  });

  const filterMap = {
    all: () => true,
    pending: o => o.status === 'claimed_pending_approval',
    active: o => ['active', 'interim_submitted', 'under_customer_review'].includes(o.status),
    revision: o => o.status === 'revision_required',
    qa: o => ['final_submitted', 'qa_review'].includes(o.status),
    done: o => ['delivered', 'payment_pending', 'completed'].includes(o.status),
  };
  // Strip leading '#' so users can paste either "3601" or "#3601".
  const searchId = search.trim().replace(/^#/, '');
  let filtered = all.filter(filterMap[filter] || (() => true));
  if (searchId) {
    filtered = filtered.filter(o => String(o.id).includes(searchId));
  }

  // KPIs
  const counts = {
    active: all.filter(o => ['active','interim_submitted','under_customer_review'].includes(o.status)).length,
    pending: all.filter(o => o.status === 'claimed_pending_approval').length,
    revision: all.filter(o => o.status === 'revision_required').length,
    qa: all.filter(o => ['final_submitted','qa_review'].includes(o.status)).length,
  };
  const inFlightHonor = all.filter(o => !['completed','cancelled'].includes(o.status)).reduce((s,o) => s + (o.netHonorarium||0), 0);
  const thisWeek = all.filter(o => {
    const d = U.daysTo(o.interimDeadline || o.finalDeadline);
    return d != null && d >= 0 && d <= 7;
  }).length;

  const StageDots = ({ stage }) => {
    const dots = [];
    if (stage?.interim1 != null) dots.push({ k: 'I1', state: stage.interim1, label: 'Zwischenstand 1' });
    if (stage?.interim2 != null) dots.push({ k: 'I2', state: stage.interim2, label: 'Zwischenstand 2' });
    dots.push({ k: 'F', state: stage?.final || 'pending', label: 'Final' });
    return (
      <div className="flex items-center gap-1">
        {dots.map((d, i) => (
          <span key={i} title={`${d.label}: ${d.state}`} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 18, fontSize: 9, fontWeight: 600, borderRadius: 4,
            background: d.state === 'done' ? 'var(--green)' : 'var(--surface-2)',
            color: d.state === 'done' ? 'white' : 'var(--text-3)',
            border: d.state === 'done' ? '1px solid var(--green)' : '1px solid var(--border)',
          }}>{d.state === 'done' ? '✓' : d.k}</span>
        ))}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Assignments</h1>
          <div className="page-subtitle">{counts.active} active · {counts.pending} awaiting approval · {counts.revision} in revision · {U.EUR(inFlightHonor)} in flight</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => navigate('gw-job-board')}><Icon name="clipboard-list" size={14}/> Browse job board</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        <div className="card" style={{ padding: 12 }}>
          <div className="text-faint fs-11">Active</div>
          <div className="mono strong" style={{ fontSize: 20, marginTop: 2 }}>{counts.active}</div>
        </div>
        <div className="card" style={{ padding: 12, border: counts.pending > 0 ? '1px solid color-mix(in oklab, var(--blue) 35%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">Awaiting approval</div>
          <div className="mono strong" style={{ fontSize: 20, color: counts.pending ? 'var(--blue)' : 'var(--text)', marginTop: 2 }}>{counts.pending}</div>
        </div>
        <div className="card" style={{ padding: 12, border: counts.revision > 0 ? '1px solid color-mix(in oklab, var(--orange) 35%, var(--border))' : undefined }}>
          <div className="text-faint fs-11">Revision</div>
          <div className="mono strong" style={{ fontSize: 20, color: counts.revision ? 'var(--orange)' : 'var(--text)', marginTop: 2 }}>{counts.revision}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="text-faint fs-11">Deadlines this week</div>
          <div className="mono strong" style={{ fontSize: 20, color: thisWeek > 0 ? 'var(--amber)' : 'var(--text)', marginTop: 2 }}>{thisWeek}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="text-faint fs-11">In-flight honor (net)</div>
          <div className="mono strong" style={{ fontSize: 20, color: 'var(--green)', marginTop: 2 }}>{U.EUR(inFlightHonor)}</div>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
          <Icon name="list" size={13} style={{ verticalAlign: '-2px', marginRight: 6 }}/>
          List
        </div>
        <div className={`tab ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>
          <Icon name="calendar" size={13} style={{ verticalAlign: '-2px', marginRight: 6 }}/>
          Calendar
        </div>
      </div>

      {/* Filter chips & search — shared by list & calendar so both views always show the same set of assignments. */}
      <div className="flex items-center gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <span style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
            display: 'inline-flex', alignItems: 'center', color: 'var(--text-3)',
            pointerEvents: 'none',
          }}>
            <Icon name="search" size={12}/>
          </span>
          <input
            type="text"
            placeholder="Search by order ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 6,
              padding: '4px 8px 4px 26px', fontSize: 12, color: 'var(--text)', minWidth: 180,
              font: 'inherit',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--blue)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              title="Clear search"
              style={{
                position: 'absolute', right: 4, background: 'transparent', border: 'none',
                cursor: 'pointer', padding: 2, display: 'inline-flex', alignItems: 'center',
                color: 'var(--text-3)',
              }}
            >
              <Icon name="x" size={12}/>
            </button>
          )}
        </div>
        {[
          ['all', `All (${all.length})`],
          ['pending', `Awaiting approval (${counts.pending})`],
          ['active', `Active (${counts.active})`],
          ['revision', `Revision (${counts.revision})`],
          ['qa', `In QA (${counts.qa})`],
          ['done', 'Done'],
        ].map(([v, l]) => (
          <button key={v} className={`chip ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
        <span style={{ flex: 1 }}/>
        <span className="text-faint fs-12">{filtered.length} of {all.length}</span>
      </div>

      {view === 'calendar' && <DeadlineCalendar orders={filtered} navigate={navigate}/>}

      {view === 'list' && (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Type</th>
              <th>Topic</th>
              <th className="num">Pages</th>
              <th>Stage</th>
              <th>Next deadline</th>
              <th className="num">Honorar (net)</th>
              <th>Customer</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="text-faint fs-12" style={{ padding: 20, textAlign: 'center' }}>
                {searchId ? `No assignments match order ID "${search}".` : 'No assignments match this filter.'}
              </td></tr>
            )}
            {filtered.map(o => {
              const cust = D.customer(o.customerId);
              const next = ['final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status) ? null : (o.stage?.interim1 === 'pending' ? o.interimDeadline : o.stage?.interim2 === 'pending' ? o.interim2Deadline : o.finalDeadline);
              const dm = next ? U.deadlineMeta(next) : { label: '—', tone: 'neutral' };
              return (
                <tr key={o.id} onClick={() => navigate('order-detail', { id: o.id })} style={{ cursor: 'pointer' }}>
                  <td className="mono"><strong>#{o.id}</strong></td>
                  <td><StatusPill status={o.status}/></td>
                  <td className="text-muted fs-12">{D.WORK_TYPE_LABELS[o.workType] || o.workType}</td>
                  <td style={{ maxWidth: 260 }}>
                    <div className="fs-12" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.titleTBD ? <em className="text-faint">folgt — awaiting customer</em> : o.title}
                    </div>
                    {o.revisionRounds > 0 && <div className="text-faint fs-11">round {o.revisionRounds + 1}</div>}
                  </td>
                  <td className="num mono">{o.pages || '—'}</td>
                  <td><StageDots stage={o.stage}/></td>
                  <td>
                    {next ? (
                      <div className="flex-col" style={{ lineHeight: 1.2 }}>
                        <span className="mono fs-11">{U.fmtDate(next)}</span>
                        <span className={`fs-11 ${dm.tone === 'danger' ? 'text-danger' : dm.tone === 'warn' ? 'text-warn' : 'text-faint'}`} style={{ color: dm.tone === 'danger' ? 'var(--red)' : dm.tone === 'warn' ? 'var(--amber)' : 'var(--text-3)' }}>{dm.label}</span>
                      </div>
                    ) : <span className="text-faint fs-11">—</span>}
                  </td>
                  <td className="num mono strong" style={{ color: 'var(--green)' }}>{U.EUR(o.netHonorarium)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar initials={cust?.initials || '··'} size={20}/>
                      <span className="fs-11 text-muted">{cust?.name?.split(' ')[0] || '—'} {cust?.name?.split(' ')[1]?.[0] || ''}.</span>
                    </div>
                  </td>
                  <td className="num">
                    {o.status === 'active' && (
                      <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); navigate('gw-submit'); }} title="Upload submission"><Icon name="upload-cloud" size={12}/></button>
                    )}
                    <button className="btn btn-sm" onClick={(e) => e.stopPropagation()}><Icon name="more-horizontal" size={12}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  );
}

export { GWActiveJobs };
