// GW · Active Jobs — assignments-in-progress view with deadlines and submissions.

// ============ GW ACTIVE JOBS ============
import React, { useState, useEffect, useMemo } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import { DeadlineCalendar } from '../shared/deadline-calendar.jsx';
import { GWTimeline } from './timeline.jsx';
import * as EFHooks from '../core/hooks.js';
import { ACTIVE_GW_ORDER_STATUSES } from '../core/selectors.js';
import * as W from '../core/workflow.js';
import EF from '../core/ef.js';
const D = EF;
const ACTIVE_STATUS_SET = new Set(ACTIVE_GW_ORDER_STATUSES);

function GWActiveJobs({ navigate }) {
  const [filter, setFilter] = useState('all');
  const [viewTab, setViewTab] = useState('list');

  // The list and the detail route must read the same live order source.
  const realMine = EFHooks.useOrders({ gwId: D.GW_ME.id });
  const submissions = EFHooks.useSubmissions();
  const submissionsByOrder = useMemo(() => {
    const byOrder = new Map();
    (submissions || []).forEach(s => {
      const key = Number(s.orderId);
      if (!byOrder.has(key)) byOrder.set(key, []);
      byOrder.get(key).push(s);
    });
    return byOrder;
  }, [submissions]);
  const calendarOrders = useMemo(
    () => realMine.filter(o => ACTIVE_STATUS_SET.has(o.status)),
    [realMine],
  );

  // Augment real with derived stage info
  const realAugmented = realMine.map(o => {
    const delivery = W.deliveryProgress(o, submissionsByOrder.get(Number(o.id)) || []);
    const stage = {
      interim1: o.interimDeadline ? (delivery.interim1Complete ? 'done' : delivery.currentKind === 'interim_1' ? 'current' : 'pending') : null,
      interim2: o.interim2Deadline ? (delivery.interim2Complete ? 'done' : delivery.currentKind === 'interim_2' ? 'current' : 'pending') : null,
      final: delivery.finalSubmitted ? 'done' : delivery.currentKind === 'final' ? 'current' : 'pending',
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
  const filtered = all.filter(filterMap[filter] || (() => true));

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
            background: d.state === 'done' ? 'var(--green)' : d.state === 'current' ? 'var(--blue)' : 'var(--surface-2)',
            color: d.state === 'done' || d.state === 'current' ? 'white' : 'var(--text-3)',
            border: d.state === 'done' ? '1px solid var(--green)' : d.state === 'current' ? '1px solid var(--blue)' : '1px solid var(--border)',
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

      <div className="tabs" style={{ marginBottom: 16 }}>
        <div className={`tab ${viewTab === 'list' ? 'active' : ''}`} onClick={() => setViewTab('list')}>
          <Icon name="briefcase" size={13}/> Assignments
        </div>
        <div className={`tab ${viewTab === 'calendar' ? 'active' : ''}`} onClick={() => setViewTab('calendar')}>
          <Icon name="calendar" size={13}/> Calendar
        </div>
        <div className={`tab ${viewTab === 'timeline' ? 'active' : ''}`} onClick={() => setViewTab('timeline')}>
          <Icon name="git-branch" size={13}/> Timeline
        </div>
      </div>

      {viewTab === 'calendar' && (
        <DeadlineCalendar
          orders={calendarOrders}
          navigate={navigate}
          embedded
        />
      )}

      {viewTab === 'timeline' && (
        <GWTimeline navigate={navigate} embedded />
      )}

      {viewTab === 'list' && (<>

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

      <div className="flex items-center gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
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
              <tr><td colSpan={10} className="text-faint fs-12" style={{ padding: 20, textAlign: 'center' }}>No assignments match this filter.</td></tr>
            )}
            {filtered.map(o => {
              const cust = D.customer(o.customerId);
              const next = ['final_submitted','qa_review','delivered','payment_pending','completed'].includes(o.status)
                ? null
                : (o.stage?.interim1 && o.stage.interim1 !== 'done')
                  ? o.interimDeadline
                  : (o.stage?.interim2 && o.stage.interim2 !== 'done')
                    ? o.interim2Deadline
                    : o.finalDeadline;
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

      </>)}
    </div>
  );
}

export { GWActiveJobs };
