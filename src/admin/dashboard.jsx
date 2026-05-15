// Admin dashboard

// ----- Sparkline -----
import React, { useState, useEffect, useMemo } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import { liveNow } from '../../data.js';
import * as W from '../core/workflow.js';
import * as EFHooks from '../core/hooks.js';
import * as EFSelectors from '../core/selectors.js';
import EF from '../core/ef.js';
const D = EF;

function Spark({ values, color = 'var(--blue)', w = 120, h = 28 }) {
  const max = Math.max(...values), min = Math.min(...values);
  const dx = w / (values.length - 1);
  const norm = v => h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i*dx).toFixed(1)},${norm(v).toFixed(1)}`).join(' ');
  const area = d + ` L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} className="spark-svg">
      <path d={area} fill={color} opacity="0.10" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// ----- Mini bar chart -----
function MiniBars({ data, w = 320, h = 110 }) {
  const max = Math.max(...data.map(d => d.v));
  const bw = (w - 24) / data.length - 6;
  return (
    <svg width={w} height={h}>
      {data.map((d, i) => {
        const bh = (d.v / max) * (h - 24);
        const x = 12 + i * (bw + 6);
        const y = h - 18 - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh} rx="2" fill={d.color || 'var(--blue)'} opacity={d.faded ? 0.35 : 1} />
            <text x={x + bw/2} y={h - 5} textAnchor="middle" className="chart-axis">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ============ ADMIN DASHBOARD ============
function DashboardLiveHeader({ k, navigate, openFridayBatch }) {
  const now = U.useNow(1000);
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{U.greetingFor(now)}, Berat.</h1>
        <div className="page-subtitle">{U.fmtWeekdayDate(now)} · {U.fmtClock(now)} local time · Friday batch {U.fridayBatchLabel(now)} · {k.fridayCount} releasable · {U.EUR(k.fridayEur)}</div>
      </div>
      <div className="page-actions">
        <button type="button" className="btn" onClick={() => navigate('order-new')}><Icon name="plus" size={14}/> New order</button>
        <button type="button" className="btn btn-primary" onClick={openFridayBatch}><Icon name="zap" size={14}/> Open Friday batch</button>
      </div>
    </div>
  );
}

function AdminDashboard({ navigate, openFridayBatch }) {
  const k = EFHooks.useKpis();
  return (
    <div className="page">
      <DashboardLiveHeader k={k} navigate={navigate} openFridayBatch={openFridayBatch} />

      <div className="kpi-grid mb-4">
        <div className={`kpi ${k.eurAtRisk > 0 ? 'danger' : ''}`} onClick={() => navigate('orders', { view: 'at_risk' })} style={{ cursor: 'pointer' }}>
          <div className="kpi-label"><Icon name="alert-triangle" size={13}/> Revenue at risk</div>
          <div className="kpi-value">{U.EUR(k.eurAtRisk)}</div>
          <div className={`kpi-delta ${k.riskItemCount > 0 ? 'danger' : ''}`}>{k.riskItemCount} item{k.riskItemCount === 1 ? '' : 's'} across offer · invoice · installments</div>
          <div className="kpi-icon-bg"><Icon name="alert-triangle" size={14}/></div>
        </div>
        <div className="kpi">
          <div className="kpi-label"><Icon name="euro" size={13}/> Open Receivables</div>
          <div className="kpi-value">{U.EUR(k.openReceivables)}</div>
          <div className="kpi-delta"><Icon name="arrow-up-right" size={12}/> {U.EUR(k.agedReceivables)} aged · {U.EUR(k.newReceivables7d)} new 7d</div>
          <div className="kpi-icon-bg"><Icon name="euro" size={14}/></div>
        </div>
        <div className="kpi" style={{ borderColor: 'color-mix(in oklab, var(--green) 30%, var(--border))', cursor: 'pointer' }} onClick={openFridayBatch}>
          <div className="kpi-label"><Icon name="wallet" size={13}/> Friday Releasable</div>
          <div className="kpi-value">{k.fridayCount} · {U.EUR(k.fridayEur)}</div>
          <div className="kpi-cta">Open Friday batch →</div>
          <div className="kpi-icon-bg"><Icon name="wallet" size={14}/></div>
        </div>
        <div className="kpi warn" onClick={() => navigate('qa')} style={{ cursor: 'pointer' }}>
          <div className="kpi-label"><Icon name="shield-check" size={13}/> QA Queue</div>
          <div className="kpi-value">{k.qaPending}</div>
          <div className="kpi-delta danger"><Icon name="flame" size={12}/> {k.aiFlagged} AI flagged</div>
          <div className="kpi-icon-bg"><Icon name="shield-check" size={14}/></div>
        </div>
        <div className={`kpi ${k.overdueInterim > 0 ? 'danger' : ''}`} onClick={() => navigate('orders', { view: 'overdue' })} style={{ cursor: 'pointer' }}>
          <div className="kpi-label"><Icon name="clock" size={13}/> Overdue Interim</div>
          <div className="kpi-value">{k.overdueInterim}</div>
          <div className={`kpi-delta ${k.overdueInterim > 0 ? 'danger' : ''}`}><Icon name="arrow-up-right" size={12}/> active orders past interim date</div>
          <div className="kpi-icon-bg"><Icon name="clock" size={14}/></div>
        </div>
        <div className="kpi warn">
          <div className="kpi-label"><Icon name="users" size={13}/> Pipedrive Subscribers</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{k.pipedriveSubs}</div>
          <div className="kpi-delta danger">83% of cap — clean up before next campaign</div>
          <div className="kpi-icon-bg"><Icon name="users" size={14}/></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <RevenueAtRisk navigate={navigate}/>
        <NeedsYourDecision navigate={navigate}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <SlaOperational navigate={navigate}/>
        <CashAndFriday navigate={navigate} openFridayBatch={openFridayBatch}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
        <TodaysDeadlines navigate={navigate}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Revenue this month</div>
            <div className="flex gap-3 fs-11">
              <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, background: 'var(--blue)', borderRadius: 2 }}/> Gross</span>
              <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, background: 'var(--green)', borderRadius: 2 }}/> GW Honorar</span>
              <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, background: 'var(--text-3)', borderRadius: 2, opacity: 0.4 }}/> Margin</span>
            </div>
          </div>
          <div className="card-pad">
            <RevenueChart />
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Pipeline funnel</div>
            <span className="text-faint fs-11">last 30 days</span>
          </div>
          <div className="card-pad">
            <FunnelChart />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <LiveActivityFeed/>
        <IntegrationsHealth navigate={navigate}/>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">GW workload heatmap</div>
          <span className="text-faint fs-11">active assignments · next 14 days</span>
        </div>
        <div className="card-pad" style={{ overflowX: 'auto' }}>
          <Heatmap />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Four dashboard queues. Every item below is derived live from the store by a
// shared selector (src/core/selectors.js). The dashboard never duplicates rule
// logic — it only renders. This guarantees counts, KPIs, and orders-list deep
// links cannot drift apart.
// =============================================================================

function QueueCard({ title, subtitle, items, emptyText, renderItem, headerCta, limit = 6 }) {
  const visible = items.slice(0, limit);
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">{title}</div>
        <div className="flex items-center gap-2">
          {subtitle && <span className="text-faint fs-11">{subtitle}</span>}
          {headerCta}
        </div>
      </div>
      <div className="card-pad flex-col gap-2">
        {items.length === 0 && (
          <div className="text-faint fs-12" style={{ padding: '24px 12px', textAlign: 'center' }}>
            <Icon name="check-circle" size={18} className="mb-2" style={{ color: 'var(--green)' }}/>
            <div>{emptyText || '0 items — all clear.'}</div>
          </div>
        )}
        {visible.map((it, i) => renderItem(it, i))}
        {items.length > limit && (
          <div className="text-faint fs-11" style={{ textAlign: 'center', paddingTop: 4 }}>
            +{items.length - limit} more · scroll Orders for full list
          </div>
        )}
      </div>
    </div>
  );
}

function ActionRow({ icon, iconTone, title, body, meta, cta, ctaTone, onClick, dangerLeft }) {
  const tones = {
    red:    { bg: 'var(--red-soft)', fg: 'var(--red)' },
    blue:   { bg: 'color-mix(in oklab, var(--blue) 14%, transparent)', fg: 'var(--blue)' },
    amber:  { bg: 'var(--amber-soft)', fg: '#B45309' },
    orange: { bg: 'color-mix(in oklab, var(--orange) 14%, transparent)', fg: 'var(--orange)' },
    green:  { bg: 'color-mix(in oklab, var(--green) 14%, transparent)', fg: 'var(--green)' },
    slate:  { bg: 'var(--surface-2)', fg: 'var(--text-2)' },
  };
  const c = tones[iconTone || 'slate'];
  return (
    <button type="button" className="action-row" onClick={onClick} style={dangerLeft ? { borderLeft: '3px solid var(--red)' } : null}>
      <div className="action-icon" style={{ background: c.bg, color: c.fg }}>
        <Icon name={icon} size={16}/>
      </div>
      <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
        <div className="text-strong fs-12" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {body && <div className="text-muted fs-11" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{body}{meta ? ' · ' + meta : ''}</div>}
      </div>
      {cta && <span className={`btn btn-sm ${ctaTone === 'blue' ? 'btn-blue' : ''}`}>{cta}</span>}
    </button>
  );
}

function fmtAge(days) {
  if (days == null) return '';
  if (days < 1) return Math.max(1, Math.round(days * 24)) + 'h';
  if (days < 7) return Math.round(days) + 'd';
  return Math.round(days) + 'd';
}

// ===== Revenue at risk =====
function RevenueAtRisk({ navigate }) {
  const items = EFHooks.useRevenueAtRisk();
  const totalEur = items.reduce((s, it) => s + (it.atRiskEur || 0), 0);
  const subtitle = items.length
    ? `${items.length} item${items.length === 1 ? '' : 's'} · ${U.EUR(totalEur)} at risk`
    : 'All clear';

  return (
    <QueueCard
      title="Revenue at risk"
      subtitle={subtitle}
      items={items}
      emptyText="No revenue blocking inactivity — funnel healthy."
      renderItem={(it, i) => {
        const o = it.order;
        const cust = D.customer(o.customerId);
        const label = it.kind === 'needs_offer' ? 'Needs offer'
          : it.kind === 'stale_offer' ? `Offer ${fmtAge(it.ageDays)} stale`
          : it.kind === 'stale_invoice' ? `Invoice ${fmtAge(it.ageDays)} unpaid`
          : it.kind === 'installment_overdue' ? `${it.overdueCount}× installment overdue`
          : it.kind === 'cancellation_risk' ? `Idle ${fmtAge(it.ageDays)}`
          : it.kind;
        const icon = it.kind === 'needs_offer' ? 'file-text'
          : it.kind === 'stale_offer' ? 'clock'
          : it.kind === 'stale_invoice' ? 'mail'
          : it.kind === 'installment_overdue' ? 'wallet'
          : 'alert-triangle';
        const tone = it.kind === 'installment_overdue' || it.urgency === 1 ? 'red'
          : it.kind === 'cancellation_risk' ? 'amber'
          : it.kind === 'needs_offer' ? 'blue'
          : 'orange';
        const cta = it.kind === 'needs_offer' ? 'Create offer'
          : it.kind === 'stale_offer' ? 'Follow up'
          : it.kind === 'stale_invoice' ? 'Chase payment'
          : it.kind === 'installment_overdue' ? 'Open order'
          : 'Decide';
        return (
          <ActionRow
            key={`${it.kind}-${o.id}-${i}`}
            icon={icon}
            iconTone={tone}
            title={`${label} · #${o.id}`}
            body={cust?.name + (o.titleTBD ? '' : ' · ' + o.title)}
            meta={`${U.EUR(it.atRiskEur || 0)}`}
            cta={cta}
            onClick={() => navigate('order-detail', {
              id: o.id,
              tab: it.kind === 'needs_offer' ? 'offer'
                : it.kind === 'stale_invoice' || it.kind === 'installment_overdue' ? 'payments'
                : 'communications',
            })}
          />
        );
      }}
      headerCta={items.length ? <button type="button" className="btn btn-sm" onClick={() => navigate('orders', { view: 'at_risk' })}>View all</button> : null}
    />
  );
}

// ===== Needs your decision =====
function NeedsYourDecision({ navigate }) {
  const items = EFHooks.useNeedsDecision();
  return (
    <QueueCard
      title="Needs your decision"
      subtitle={`${items.length} item${items.length === 1 ? '' : 's'}`}
      items={items}
      emptyText="0 decisions — all clear."
      renderItem={(it, i) => {
        const o = it.order;
        const cust = o ? D.customer(o.customerId) : null;
        const labels = {
          ai_violation: { title: o ? `🚨 AI Violation · #${o.id}` : 'AI violation', tone: 'red', icon: 'alert-triangle', cta: 'Review' },
          plagiarism_violation: { title: o ? `🚨 Plagiarism · #${o.id}` : 'Plagiarism', tone: 'red', icon: 'alert-triangle', cta: 'Review' },
          claim_approval: { title: `${it.claimerName || 'GW'} claimed #${o?.id} — approve to start`, tone: 'blue', icon: 'feather', cta: 'Approve' },
          extension: { title: `Extension requested · #${o?.id}`, tone: 'amber', icon: 'plus', cta: 'Decide' },
          delay: { title: `Delay reported · #${o?.id}`, tone: 'amber', icon: 'clock', cta: 'Decide' },
          dispute: { title: `Dispute open · #${o?.id}`, tone: 'orange', icon: 'alert-triangle', cta: 'Open' },
          thread_flag: { title: it.subject ? `Flagged thread · ${o ? '#' + o.id : 'lead'}` : 'Flagged thread', tone: 'blue', icon: 'message-square', cta: 'Inbox' },
        };
        const L = labels[it.kind] || { title: it.kind, tone: 'slate', icon: 'help-circle', cta: 'Open' };
        const body = it.kind === 'thread_flag'
          ? it.subject + ' · ' + (it.lastAt ? U.relTime(it.lastAt) : '')
          : it.kind === 'ai_violation' || it.kind === 'plagiarism_violation' ? `${o?.title} · GW ${D.gw(o?.gwId)?.name || 'unknown'} · ${it.reason || ''}`
          : it.kind === 'extension' && o?.extensionPending ? `${o.extensionPending.extraPages ? '+' + o.extensionPending.extraPages + 'p · ' : ''}${o.extensionPending.requestedAt ? U.relTime(o.extensionPending.requestedAt) : ''}`
          : it.kind === 'delay' && o ? `${o.delayReason || ''}${o.proposedNewDeadline ? ' · new ' + U.fmtDate(o.proposedNewDeadline) : ''}`
          : it.kind === 'dispute' && o ? `${cust?.name || ''} · revision round ${o.revisionRounds || 0}`
          : it.kind === 'claim_approval' && o ? `${D.WORK_TYPE_LABELS[o.workType] || o.workType} · ${o.pages || '—'}p · ${o.netHonorarium ? U.EUR(o.netHonorarium) : ''}${o.claimedAt ? ' · ' + U.relTime(o.claimedAt) : ''}` : '';
        return (
          <ActionRow
            key={`${it.kind}-${o ? o.id : it.threadId}-${i}`}
            icon={L.icon}
            iconTone={L.tone}
            title={L.title}
            body={body}
            cta={L.cta}
            ctaTone={L.tone === 'red' ? 'red' : L.tone === 'blue' ? 'blue' : null}
            onClick={() => it.kind === 'thread_flag' ? navigate('inbox', it.threadId ? { thread: it.threadId } : {}) : navigate('order-detail', { id: o.id })}
            dangerLeft={L.tone === 'red'}
          />
        );
      }}
      headerCta={items.length ? <button type="button" className="btn btn-sm" onClick={() => navigate('orders', { view: 'decision' })}>View all</button> : null}
    />
  );
}

// ===== SLA & operational =====
function SlaOperational({ navigate }) {
  const items = EFHooks.useSlaOperational();
  return (
    <QueueCard
      title="SLA & operational"
      subtitle={`${items.length} item${items.length === 1 ? '' : 's'}`}
      items={items}
      emptyText="All operational SLAs are green."
      renderItem={(it, i) => {
        const o = it.order;
        const cust = D.customer(o.customerId);
        const gw = D.gw(o.gwId);
        const labels = {
          paid_no_gw: { title: `Paid ${Math.round(it.hours)}h ago, no GW · #${o.id}`, tone: it.hours >= 48 ? 'red' : 'amber', icon: 'briefcase', cta: 'Assign' },
          no_intro: { title: `GW assigned, no customer intro · #${o.id}`, tone: 'red', icon: 'mail', cta: 'Ping GW' },
          interim_missed: { title: `Interim missed ${it.daysPast || 0}d · #${o.id}`, tone: 'red', icon: 'clock', cta: 'Contact GW' },
          final_qa: { title: `Final awaiting your QA · #${o.id}`, tone: 'amber', icon: 'shield', cta: 'QA review' },
          folgt_stale: { title: `"folgt" topic ${fmtAge(it.ageDays)} · #${o.id}`, tone: 'amber', icon: 'help-circle', cta: 'Chase' },
        };
        const L = labels[it.kind] || { title: it.kind, tone: 'slate', icon: 'help-circle', cta: 'Open' };
        const body = `${cust?.name || ''}${gw ? ' · GW ' + gw.name : ''} · ${D.WORK_TYPE_LABELS[o.workType] || o.workType}`;
        const destTab = it.kind === 'paid_no_gw' ? 'assignment'
          : it.kind === 'no_intro' || it.kind === 'interim_missed' || it.kind === 'folgt_stale' ? 'communications'
          : it.kind === 'final_qa' ? 'submissions'
          : undefined;
        return (
          <ActionRow
            key={`${it.kind}-${o.id}-${i}`}
            icon={L.icon}
            iconTone={L.tone}
            title={L.title}
            body={body}
            cta={L.cta}
            onClick={() => navigate('order-detail', { id: o.id, tab: destTab })}
          />
        );
      }}
      headerCta={items.length ? <button type="button" className="btn btn-sm" onClick={() => navigate('orders', { view: 'sla' })}>View all</button> : null}
    />
  );
}

// ===== Cash & Friday =====
function CashAndFriday({ navigate, openFridayBatch }) {
  const cash = EFHooks.useCashFriday();
  const now = U.useNow(60000);
  const batchLabel = U.fridayBatchLabel(now);
  const releasableEur = cash.releaseable.reduce((s, o) => s + (o.netHonorarium || 0), 0);
  const blockedEur = cash.blocked.reduce((s, b) => s + (b.order.netHonorarium || 0), 0);

  // Compose a single list of rows in priority order: blocked > refund/storno.
  // Missing invoices are already included in blocked via releaseGates(), and
  // are also counted separately in the small metric because they are data-fixable.
  const rows = [];
  cash.blocked.forEach(b => {
    const reason = b.gates.reasons.filter(r => r !== 'Order is not awaiting Friday release')[0] || 'gates blocked';
    rows.push({ kind: reason === 'GW invoice not received' ? 'missing_invoice' : 'blocked', order: b.order, reason });
  });
  cash.refundPending.forEach(o => rows.push({ kind: 'refund', order: o }));

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Cash &amp; Friday</div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn btn-sm" onClick={() => navigate('orders', { view: 'cash' })}>View orders</button>
          <button type="button" className="btn btn-sm" onClick={openFridayBatch}><Icon name="wallet" size={11}/> Open batch</button>
        </div>
      </div>
      <div className="card-pad flex-col gap-2">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <button type="button" onClick={openFridayBatch} style={{ padding: 10, textAlign: 'left', background: 'color-mix(in oklab, var(--green) 6%, var(--surface))', border: '1px solid color-mix(in oklab, var(--green) 30%, var(--border))', borderRadius: 8, cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
            <div className="text-faint fs-11">Releasable {batchLabel}</div>
            <div className="mono strong" style={{ fontSize: 18, color: 'var(--green)' }}>{cash.releaseable.length}</div>
            <div className="text-muted fs-11">{U.EUR(releasableEur)}</div>
          </button>
          <button type="button" onClick={openFridayBatch} style={{ padding: 10, textAlign: 'left', background: cash.blocked.length ? 'var(--amber-soft)' : 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
            <div className="text-faint fs-11">Friday blocked</div>
            <div className="mono strong" style={{ fontSize: 18, color: cash.blocked.length ? '#B45309' : 'var(--text-2)' }}>{cash.blocked.length}</div>
            <div className="text-muted fs-11">{U.EUR(blockedEur)}</div>
          </button>
          <button type="button" onClick={() => navigate('orders', { view: 'cash' })} style={{ padding: 10, textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
            <div className="text-faint fs-11">GW invoice missing</div>
            <div className="mono strong" style={{ fontSize: 18, color: cash.missingInvoice.length ? 'var(--orange)' : 'var(--text-2)' }}>{cash.missingInvoice.length}</div>
            <div className="text-muted fs-11">payment_pending</div>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, fontSize: 11, marginTop: 4 }}>
          <div className="text-faint">Aging receivables</div>
          <div className="mono"><span className="text-faint">0–30 </span>{U.EUR(cash.aged['0_30'])}</div>
          <div className="mono"><span className="text-faint">30–60 </span>{U.EUR(cash.aged['30_60'])}</div>
          <div className="mono"><span className="text-faint">60+ </span><span style={{ color: cash.aged['60_plus'] > 0 ? 'var(--red)' : 'var(--text-2)' }}>{U.EUR(cash.aged['60_plus'])}</span></div>
        </div>
        {rows.length === 0 && (
          <div className="text-faint fs-12" style={{ padding: '12px 0', textAlign: 'center' }}>
            <Icon name="check-circle" size={16} style={{ color: 'var(--green)', marginRight: 6 }}/>
            All clear — no blocked, missing-invoice, or refund items.
          </div>
        )}
        {rows.slice(0, 5).map((r, i) => {
          const o = r.order;
          const cust = D.customer(o.customerId);
          if (r.kind === 'blocked') {
            const destTab = r.reason?.includes('Installments') ? 'payments'
              : r.reason?.includes('Quality') ? 'submissions'
              : undefined;
            return (
              <ActionRow
                key={`blocked-${o.id}-${i}`}
                icon="shield"
                iconTone="amber"
                title={`Friday gate blocked · #${o.id}`}
                body={`${cust?.name || ''} · ${U.EUR(o.netHonorarium || 0)}`}
                meta={r.reason}
                cta="Resolve"
                onClick={() => navigate('order-detail', { id: o.id, tab: destTab })}
              />
            );
          }
          if (r.kind === 'missing_invoice') {
            return (
              <ActionRow
                key={`mi-${o.id}-${i}`}
                icon="file-text"
                iconTone="orange"
                title={`GW invoice missing · #${o.id}`}
                body={`GW ${D.gw(o.gwId)?.name || ''} · ${U.EUR(o.netHonorarium || 0)}`}
                meta={r.reason || 'blocks Friday'}
                cta="Open"
                onClick={() => navigate('order-detail', { id: o.id, tab: 'payments' })}
              />
            );
          }
          return (
            <ActionRow
              key={`r-${o.id}-${i}`}
              icon="rotate-ccw"
              iconTone="red"
              title={`Refund pending · #${o.id}`}
              body={`${cust?.name || ''} · ${U.EUR(o.paidEur || 0)} paid before storno`}
              cta="Refund"
              onClick={() => navigate('order-detail', { id: o.id, tab: 'payments' })}
            />
          );
        })}
      </div>
    </div>
  );
}

// ===== Today's Deadlines (derived) =====
// Pulls all interim/final deadlines in a +/- window from the demo NOW. Replaces
// the hardcoded list, so a delay-reported or extension-approved order updates
// the panel immediately on role-switch.
function TodaysDeadlines({ navigate }) {
  const orders = EFHooks.useOrders();
  const NOW = liveNow();
  const closedStates = new Set(['completed','cancelled','payment_pending','delivered']);
  const items = [];
  orders.forEach(o => {
    if (closedStates.has(o.status) || W.isPrePayment(o)) return;
    if (o.interimDeadline) items.push({ orderId: o.id, kind: 'interim_1', label: 'Zwischenstand 1', date: o.interimDeadline, order: o });
    if (o.interim2Deadline) items.push({ orderId: o.id, kind: 'interim_2', label: 'Zwischenstand 2', date: o.interim2Deadline, order: o });
    if (o.finalDeadline) items.push({ orderId: o.id, kind: 'final', label: 'Final', date: o.finalDeadline, order: o });
  });
  items.sort((a, b) => new Date(a.date) - new Date(b.date));
  // Window: from yesterday to +5 days, capped at 6.
  const windowStart = new Date(NOW); windowStart.setDate(windowStart.getDate() - 1);
  const windowEnd = new Date(NOW); windowEnd.setDate(windowEnd.getDate() + 5);
  const visible = items.filter(d => {
    const dt = new Date(d.date);
    return dt >= windowStart && dt <= windowEnd;
  }).slice(0, 6);

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Today's deadlines</div>
        <span className="text-faint fs-11">{visible.length} items · next 5 days</span>
      </div>
      <div className="card-pad">
        {visible.length === 0 ? (
          <div className="text-faint fs-12" style={{ padding: '12px 0' }}>No upcoming deadlines in the window.</div>
        ) : (
          <div className="timeline">
            {visible.map((d, i) => {
              const meta = U.deadlineMeta(d.date);
              const cust = D.customer(d.order.customerId);
              const gw = D.gw(d.order.gwId);
              const dotTone = meta.tone === 'danger' ? 'red' : meta.tone === 'warn' ? '' : '';
              const pillTone = meta.tone === 'danger' ? 'pill-red' : meta.tone === 'warn' ? 'pill-amber' : 'pill-slate';
              const isFlagged = d.order.flagged || d.order.status === 'ai_violation_review';
              return (
                <div key={`${d.orderId}-${d.kind}-${i}`} className="timeline-item" style={{ cursor: 'pointer' }} onClick={() => navigate('order-detail', { id: d.orderId })}>
                  <div className={`timeline-dot ${dotTone}`}><Icon name="dot" size={10}/></div>
                  <div className="timeline-content">
                    <div className="timeline-title">
                      <span className={`pill ${pillTone}`} style={{ marginRight: 6 }}>{meta.label}</span>
                      Order #{d.orderId} · <span className="mono">{d.label}</span> — {U.fmtDate(d.date)}, 18:00
                      {isFlagged && <span className="pill pill-red" style={{ marginLeft: 6 }}>blocked</span>}
                    </div>
                    <div className="timeline-meta">
                      {cust?.name || ''}{gw ? ` · GW ${gw.name}` : ''} · {D.WORK_TYPE_LABELS[d.order.workType] || d.order.workType}{d.order.pages ? `, ${d.order.pages} pages` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Live activity feed: Pipedrive · Stripe · Cloudflare · Plagiarism · GPTZero
// Deterministic event stream — appends a new event every ~7 s with a flash animation.
const LIVE_SEED = [
  { kind: 'stripe', icon: 'wallet', color: 'var(--green)', text: 'payment_intent.succeeded · #3540 · €686.00 · Klarna', detail: 'pi_3Q8x2pAB' },
  { kind: 'pipedrive', icon: 'git-branch', color: 'var(--blue)', text: 'deal.update · #3526 · stage=Won', detail: 'syncCheck OK' },
  { kind: 'plag', icon: 'shield-check', color: 'var(--green)', text: 'plagiarism.scanned · sub s4 · 6%', detail: 'PlagScan · 2.4s' },
  { kind: 'sevdesk', icon: 'file-text', color: 'var(--blue)', text: 'invoice.changeStatus · RG-2026-3540 · paid', detail: 'sevUser=ef1-platform' },
  { kind: 'cloudflare', icon: 'mail', color: 'var(--text-2)', text: 'email.received · order-3499@orders.efactory1.de', detail: 'keyword=Rate → redirected' },
  { kind: 'ai', icon: 'bot', color: 'var(--red)', text: 'gptzero.flag · sub s2 · 87% (#3517)', detail: 'GPT-4 burstiness signature' },
  { kind: 'pipedrive', icon: 'git-branch', color: 'var(--blue)', text: 'person.update · marketing_status=subscribed', detail: 'PE-2114' },
  { kind: 'stripe', icon: 'wallet', color: 'var(--green)', text: 'payment_intent.succeeded · #3539 · €293.08 · SEPA', detail: 'pi_3QAa1cWv' },
  { kind: 'plag', icon: 'shield-check', color: 'var(--green)', text: 'plagiarism.scanned · sub s7 · 4%', detail: 'PlagScan · 1.9s' },
  { kind: 'cloudflare', icon: 'mail', color: 'var(--text-2)', text: 'email.received · order-3522@orders.efactory1.de', detail: 'GW → customer · CC efactory1' },
  { kind: 'sevdesk', icon: 'file-text', color: 'var(--blue)', text: 'order.sendViaEmail · AN-2026-3527', detail: 'Angebot sent' },
];
function LiveActivityFeed() {
  const { useState, useEffect } = React;
  const [events, setEvents] = useState(() =>
    LIVE_SEED.slice(0, 6).map((e, i) => ({ ...e, id: 'init-' + i, t: new Date(Date.now() - (i + 1) * 32000).toISOString(), fresh: false }))
  );
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return undefined;
    let i = 0;
    const tick = () => {
      const tpl = LIVE_SEED[i % LIVE_SEED.length];
      i++;
      setEvents(prev => [{ ...tpl, id: 'live-' + Date.now(), t: new Date().toISOString(), fresh: true }, ...prev].slice(0, 8));
      setTimeout(() => setEvents(prev => prev.map(x => ({ ...x, fresh: false }))), 1700);
    };
    const handle = setInterval(tick, 7000);
    return () => clearInterval(handle);
  }, [paused]);
  const fmtTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  const labelFor = (k) => ({ stripe: 'Stripe', pipedrive: 'Pipedrive', sevdesk: 'Sevdesk', cloudflare: 'Cloudflare', plag: 'PlagScan', ai: 'GPTZero' })[k] || k;
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title flex items-center gap-2"><span className="ef-live-dot"/> Live activity</div>
        <div className="flex items-center gap-2">
          <span className="text-faint fs-11 mono">{events.length} of last 8</span>
          <button type="button" className="btn btn-sm" onClick={() => setPaused(p => !p)}>
            <Icon name={paused ? 'zap' : 'eye'} size={11}/> {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>
      <div className="card-pad" style={{ padding: 0 }}>
        <table className="tbl" style={{ fontSize: 11.5 }}>
          <thead>
            <tr>
              <th style={{ width: 44 }}></th>
              <th>Service</th>
              <th>Event</th>
              <th>Detail</th>
              <th className="num">Time</th>
            </tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id} className={e.fresh ? 'ef-flash-green' : ''}>
                <td>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: 'color-mix(in oklab, ' + e.color + ' 12%, var(--surface-2))', color: e.color, display: 'grid', placeItems: 'center' }}>
                    <Icon name={e.icon} size={13}/>
                  </div>
                </td>
                <td className="strong">{labelFor(e.kind)}</td>
                <td className="mono fs-11">{e.text}</td>
                <td className="text-faint fs-11 mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }}>{e.detail}</td>
                <td className="num text-faint fs-11 mono">{fmtTime(e.t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Integrations health card with animated sync sweep + retry button per integration
function IntegrationsHealth({ navigate }) {
  const { useState } = React;
  const [syncing, setSyncing] = useState(null);
  const [lastSync, setLastSync] = useState({
    pipedrive: '2026-05-07T13:18:00',
    sevdesk: '2026-05-07T13:18:00',
    stripe: '2026-05-07T14:31:00',
    cloudflare: '2026-05-07T14:32:00',
    plag: '2026-05-07T11:42:00',
    ai: '2026-05-07T09:14:00',
  });
  const triggerSync = (k) => {
    setSyncing(k);
    setTimeout(() => {
      setLastSync(prev => ({ ...prev, [k]: new Date().toISOString() }));
      setSyncing(null);
    }, 850);
  };
  const fmtAgo = (iso) => {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.max(1, Math.floor(ms / 60000));
    if (m < 60) return m + 'm ago';
    return Math.floor(m / 60) + 'h ago';
  };
  const items = [
    { k: 'pipedrive', name: 'Pipedrive', sub: 'CRM · 4,159/5,000 subs', icon: 'git-branch', status: 'warn' },
    { k: 'sevdesk', name: 'Sevdesk', sub: 'Invoicing · 645 RG YTD', icon: 'file-text', status: 'ok' },
    { k: 'stripe', name: 'Stripe', sub: 'payment_intent · 0 fail/7d', icon: 'wallet', status: 'ok' },
    { k: 'cloudflare', name: 'Cloudflare Email', sub: 'Worker order-proxy v4', icon: 'mail', status: 'ok' },
    { k: 'plag', name: 'PlagScan / Turnitin', sub: 'API quota 87% remaining', icon: 'shield-check', status: 'ok' },
    { k: 'ai', name: 'GPTZero', sub: 'Per-paragraph score', icon: 'bot', status: 'ok' },
  ];
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title flex items-center gap-2"><span className="ef-live-dot blue"/> Integrations</div>
        <button type="button" className="btn btn-sm" onClick={() => navigate('settings')}>
          <Icon name="settings" size={11}/> Manage
        </button>
      </div>
      <div className="card-pad flex-col gap-2">
        {items.map(i => {
          const isSync = syncing === i.k;
          return (
            <div key={i.k} className="flex items-center gap-3" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text-2)', display: 'grid', placeItems: 'center' }}>
                <Icon name={i.icon} size={14}/>
              </div>
              <div className="flex-col" style={{ flex: 1, lineHeight: 1.25 }}>
                <span className="strong fs-12">{i.name}</span>
                <span className="text-faint fs-11">{i.sub} · last sync <span className="mono">{fmtAgo(lastSync[i.k])}</span></span>
              </div>
              {i.status === 'ok' && <span className="pill pill-green" style={{ fontSize: 10 }}>Connected</span>}
              {i.status === 'warn' && <span className="pill pill-amber" style={{ fontSize: 10 }}>Warning</span>}
              <button
                type="button"
                className="btn btn-sm"
                disabled={isSync}
                onClick={() => triggerSync(i.k)}
                aria-label={`Sync ${i.name} now`}
                title="Sync now"
              >
                <Icon name="rotate-ccw" size={11} className={isSync ? 'ef-spin' : ''}/>
              </button>
              {isSync && <span className="ef-sync-sweep"/>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RevenueChart() {
  const w = 660, h = 200, pad = { l: 40, r: 12, t: 12, b: 24 };
  const days = ['01','03','05','07','09','11','13','15','17','19','21','23','25','27'];
  const gross  = [4200, 6100, 5800, 7900, 9100, 8200, 6700, 9800, 11200, 8800, 10100, 9400, 11800, 12100];
  const honor  = [1680, 2440, 2320, 3160, 3640, 3280, 2680, 3920, 4480, 3520, 4040, 3760, 4720, 4840];
  const margin = gross.map((g, i) => g - honor[i]);
  const max = Math.max(...gross) * 1.1;
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const x = i => pad.l + (i / (days.length - 1)) * innerW;
  const y = v => pad.t + innerH - (v / max) * innerH;
  const line = vals => vals.map((v,i)=> `${i===0?'M':'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = vals => line(vals) + ` L${x(vals.length-1)},${pad.t+innerH} L${x(0)},${pad.t+innerH} Z`;
  return (
    <svg width={w} height={h} style={{ width: '100%', height: 'auto', maxWidth: w }} viewBox={`0 0 ${w} ${h}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const yy = pad.t + innerH * (1 - p);
        return <g key={i}>
          <line x1={pad.l} x2={w-pad.r} y1={yy} y2={yy} className="chart-grid" />
          <text x={pad.l - 6} y={yy+3} textAnchor="end" className="chart-axis">€{Math.round(max*p/1000)}k</text>
        </g>;
      })}
      <path d={area(gross)} fill="var(--blue)" opacity="0.10" />
      <path d={line(gross)} fill="none" stroke="var(--blue)" strokeWidth="1.8"/>
      <path d={line(honor)} fill="none" stroke="var(--green)" strokeWidth="1.5"/>
      <path d={line(margin)} fill="none" stroke="var(--text-3)" strokeWidth="1.2" strokeDasharray="3 3"/>
      {days.map((d, i) => i % 2 === 0 && (
        <text key={i} x={x(i)} y={h - 6} textAnchor="middle" className="chart-axis">{d}.</text>
      ))}
    </svg>
  );
}

function FunnelChart() {
  const stages = [
    { name: 'Anfrage', count: 142, color: 'var(--text-3)' },
    { name: 'Qualifiziert', count: 86, color: '#94A3B8' },
    { name: 'Proposal', count: 54, color: 'var(--blue)' },
    { name: 'Rechnung angefordert', count: 38, color: 'var(--blue)' },
    { name: 'Won', count: 31, color: 'var(--green)' },
  ];
  const max = stages[0].count;
  return (
    <div className="flex-col gap-2">
      {stages.map(s => (
        <div key={s.name} className="flex items-center gap-3">
          <div style={{ width: 130, fontSize: 12 }}>{s.name}</div>
          <div style={{ flex: 1, height: 22, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: `${(s.count/max)*100}%`, height: '100%', background: s.color, borderRadius: 4, transition: 'width .3s' }}/>
          </div>
          <div className="mono" style={{ width: 36, textAlign: 'right', fontSize: 12 }}>{s.count}</div>
        </div>
      ))}
      <div className="flex justify-between fs-11 text-faint mt-2">
        <span>Conversion: 21.8%</span>
        <span>Avg deal size: {U.EUR(2240)}</span>
      </div>
    </div>
  );
}

function Heatmap() {
  const orders = EFHooks.useOrders();
  const ghostwriters = EFHooks.useGhostwriters();
  const days = Array.from({length: 14}, (_, i) => {
    const d = new Date('2026-05-08');
    d.setDate(d.getDate() + i);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    return { d: d.getDate(), date: d, start, end, label: ['So','Mo','Di','Mi','Do','Fr','Sa'][d.getDay()] };
  });
  const gws = ghostwriters.filter(g => !g.isOwner).slice(0, 11);
  const openStatuses = new Set(EFSelectors.ACTIVE_GW_ORDER_STATUSES);
  const sameDay = (iso, day) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d >= day.start && d <= day.end;
  };
  const activeOnDay = (order, day) => {
    if (!openStatuses.has(order.status)) return false;
    const start = new Date(order.assignedAt || order.claimApprovedAt || order.acceptedAt || order.claimedAt || order.leadCreatedAt || '2026-05-07T00:00:00');
    if (start > day.end) return false;
    const final = order.finalDeadline ? new Date(order.finalDeadline) : null;
    if (!final) return true;
    return final >= day.start || ['revision_required','final_submitted','qa_review','delay_reported','extension_requested'].includes(order.status);
  };
  const loadFor = (gw, day) => {
    if (gw.banned) return { value: 0, active: 0, due: 0 };
    const assigned = orders.filter(o => o.gwId === gw.id && activeOnDay(o, day));
    const due = assigned.filter(o =>
      sameDay(o.interimDeadline, day) ||
      sameDay(o.interim2Deadline, day) ||
      sameDay(o.finalDeadline, day)
    );
    return {
      value: Math.min(5, assigned.length + due.length),
      active: assigned.length,
      due: due.length,
    };
  };
  return (
    <div style={{ display: 'inline-grid', gridTemplateColumns: 'auto repeat(14, 28px)', gap: 3, fontSize: 11 }}>
      <div></div>
      {days.map((d, i) => (
        <div key={i} style={{ textAlign: 'center', color: 'var(--text-3)' }}>
          <div>{d.label}</div>
          <div className="mono" style={{ color: 'var(--text-2)' }}>{String(d.d).padStart(2,'0')}</div>
        </div>
      ))}
      {gws.map(gw => (
        <React.Fragment key={gw.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingRight: 12, fontSize: 11.5 }}>
            <Avatar initials={gw.initials} size={20} />
            <span style={{ color: gw.banned ? 'var(--text-3)' : 'var(--text)' }}>{gw.name}</span>
            {gw.banned && <Icon name="eye" size={11} className="text-faint" />}
          </div>
          {days.map((_, i) => {
            const load = loadFor(gw, days[i]);
            return <div key={i} className={`heat-cell heat-${load.value}`} title={`${gw.name} · ${load.active} active assignment${load.active === 1 ? '' : 's'} · ${load.due} deadline${load.due === 1 ? '' : 's'}`} />;
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

export { AdminDashboard, Spark, MiniBars };
