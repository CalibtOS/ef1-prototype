// GW · Job Board — claimable jobs with admin perspective toggle. Includes ClaimModal.

// ============ GW JOB BOARD ============
// Same surface, two perspectives: GW claims, admin manages (no Claim button).
import React, { useMemo, useState } from 'react';
import { Icon, Avatar, NotReady } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import * as EFHooks from '../core/hooks.js';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
const D = EF;

const WORK_FILTERS = [
  ['all', 'Alle'],
  ['hausarbeit', 'Hausarbeit'],
  ['bachelorarbeit', 'Bachelor'],
  ['masterarbeit', 'Master'],
  ['lektorat', 'Lektorat'],
  ['expose', 'Exposé'],
];

const metricItems = (open, urgent, week, honor) => [
  { label: 'Offene Aufträge', value: open },
  { label: 'Dringend', value: urgent, tone: urgent ? 'danger' : null },
  { label: 'Diese Woche', value: week, tone: week ? 'warn' : null },
  { label: 'Honorar netto', value: U.EUR(honor), tone: 'money' },
];

function GWJobBoard({ navigate, toast, role = 'gw' }) {
  const isAdmin = role === 'admin';
  const [filter, setFilter] = useState('all');
  const [claimingId, setClaimingId] = useState(null);
  EFHooks.useStore(s => s.meta.version);
  const currentGwId = EFHooks.useStore(s => s.session.gwId);
  const applicationsTable = EFHooks.useStore(s => s.entities.gw_applications);
  const myPendingApps = (applicationsTable?.allIds || [])
    .map(id => applicationsTable.byId[id])
    .filter(a => a && a.gwId === currentGwId && a.status === 'pending');
  // Source of truth: ORDERS where status === 'available' AND no GW assigned.
  // Scenario orders (those that came through the new acquisition flow with a
  // scenarioId) only appear on the board after the admin explicitly publishes
  // them via `publishJobToBoard`. Legacy seed orders without a scenarioId
  // continue to behave as before so the existing demo isn't disrupted.
  const unclaimed = EFHooks.useOrders({ filter: 'available' })
    .filter(o => {
      if (o.status !== 'available' || o.gwId) return false;
      if (o.scenarioId) return o.jobBoardStatus === 'open';
      return true;
    })
    .map(o => ({
      id: o.id,
      workType: o.workType,
      field: o.field,
      pages: o.pages,
      deadline: o.finalDeadline,
      interimDeadline: o.interimDeadline,
      honorEur: o.netHonorarium,
      grossEur: o.grossEur,
      customerId: o.customerId,
      factor: U.daysTo(o.finalDeadline) < 7 ? '1.5' : '1.0',
      topic: o.titleTBD ? 'Titel folgt — Briefing nach Claim' : o.title,
      adminNote: o.gwBoardNote || o.offerNote || null,
      urgent: U.daysTo(o.finalDeadline) < 7,
      jobBoardStatus: o.jobBoardStatus,
      assignmentMode: o.assignmentMode,
    }));

  const onApply = (id) => {
    const res = EFActions.gw.applyForJob(id, currentGwId, {
      pitch: 'Ich habe passende Expertise und melde mich heute beim Kunden.',
      termsAccepted: true,
    });
    if (res?.ok && toast) {
      toast({
        tone: 'success',
        transition: { entity: `Order #${id}`, from: 'On Job Board', to: 'Bewerbung eingereicht' },
        text: 'Bewerbung gesendet · Berat prüft alle Bewerbungen',
      });
    }
  };
  const hasMyApplication = (id) => myPendingApps.some(a => a.orderId === id);

  const typeCounts = useMemo(() => {
    return unclaimed.reduce((acc, job) => {
      acc[job.workType] = (acc[job.workType] || 0) + 1;
      return acc;
    }, {});
  }, [unclaimed]);

  const filtered = useMemo(() => {
    const rows = filter === 'all' ? unclaimed : unclaimed.filter(o => o.workType === filter);
    return [...rows].sort((a, b) => {
      const da = U.daysTo(a.deadline) ?? Number.MAX_SAFE_INTEGER;
      const db = U.daysTo(b.deadline) ?? Number.MAX_SAFE_INTEGER;
      if (da !== db) return da - db;
      return (b.honorEur || 0) - (a.honorEur || 0);
    });
  }, [filter, unclaimed]);

  const onUnpublish = (id) => {
    EFActions.orders.hold(id, 'Unpublished by admin');
    toast && toast({
      tone: 'info',
      transition: { entity: `Order #${id}`, from: 'On Job Board', to: 'On Hold' },
      text: 'Removed by admin',
    });
  };

  const urgentCount = unclaimed.filter(j => j.urgent).length;
  const totalHonor = unclaimed.reduce((s, j) => s + (j.honorEur || 0), 0);
  const thisWeek = unclaimed.filter(j => {
    const d = U.daysTo(j.deadline);
    return d != null && d >= 0 && d <= 7;
  }).length;
  const boardMetrics = metricItems(unclaimed.length, urgentCount, thisWeek, totalHonor);

  return (
    <div className="page gw-board-page">
      <section className="gw-board-hero">
        <div className="gw-board-kicker">Autor:innen Dashboard</div>
        <div className="gw-board-title-row">
          <h1 className="gw-board-title">efactory1 Dashboard für Autor:innen</h1>
          <div className="gw-board-actions">
            {isAdmin
              ? <button type="button" className="btn btn-primary" onClick={() => navigate('orders')}><Icon name="plus" size={14}/> Auftrag veröffentlichen</button>
              : <NotReady className="btn" feature="alerts"><Icon name="bell" size={14}/> Benachrichtigungen</NotReady>}
          </div>
        </div>
        <div className="gw-board-metrics" aria-label="Job board overview">
          {boardMetrics.map(item => (
            <div key={item.label} className={`gw-board-metric ${item.tone ? 'is-' + item.tone : ''}`}>
              <span>{item.label}</span>
              <strong className="mono">{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="gw-board-section">
        <div className="gw-board-section-head">
          <div>
            <h2>Aktuell verfügbare Aufträge</h2>
            <div className="gw-board-section-meta">{filtered.length} von {unclaimed.length} sichtbar · sortiert nach Dringlichkeit</div>
          </div>
        </div>

        <div className="gw-board-toolbar">
          <div className="gw-board-view-tabs" role="tablist" aria-label="Auftragsfilter">
            {WORK_FILTERS.map(([key, label]) => {
              const count = key === 'all' ? unclaimed.length : (typeCounts[key] || 0);
              return (
                <button
                  type="button"
                  key={key}
                  role="tab"
                  aria-selected={filter === key}
                  className={`gw-board-tab ${filter === key ? 'active' : ''}`}
                  onClick={() => setFilter(key)}
                >
                  <span>{label}</span>
                  <span className="mono">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {!isAdmin && (
          <div className="banner gw-board-privacy">
            <Icon name="lock" size={12}/>
            <span>Kundenname und Kontaktdaten sind <strong>verborgen</strong>, bis Ihre Bewerbung genehmigt wurde.</span>
          </div>
        )}

        <div className="gw-board-database">
          <div className="gw-board-table-scroll">
            <table className={`tbl gw-board-table ${isAdmin ? 'gw-board-clickable' : ''}`}>
          <colgroup>
            <col style={{ width: 92 }} />
            <col style={{ width: 138 }} />
            <col style={{ width: 330 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 84 }} />
            <col style={{ width: 166 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 138 }} />
            {isAdmin && <col style={{ width: 112 }} />}
            {isAdmin && <col style={{ width: 160 }} />}
            <col style={{ width: 154 }} />
            <col style={{ width: 280 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Auftrags ID</th>
              <th>Art der Arbeit</th>
              <th>Titel der Arbeit</th>
              <th>Fachbereich</th>
              <th className="num">Seitenanzahl</th>
              <th>Verbindliches finales Lieferdatum <span>bis 18 Uhr</span></th>
              <th>Verbindlicher 1. Zwischenstand <span>bis 18 Uhr</span></th>
              <th className="num">{isAdmin ? 'GW-Honorar' : 'Gesamthonorar'} <span>Netto</span></th>
              {isAdmin && <th className="num">Brutto</th>}
              {isAdmin && <th>Kunde</th>}
              <th aria-label="Aktion"></th>
              <th>Weitere Notiz von efactory1.de</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 12 : 10} className="text-faint fs-12" style={{ padding: 20, textAlign: 'center' }}>
                  Aktuell keine offenen Aufträge.
                </td>
              </tr>
            )}
            {filtered.map(j => {
              const dm = U.deadlineMeta(j.deadline);
              const cust = isAdmin ? D.customer(j.customerId) : null;
              const rowTone = dm.tone === 'danger' ? 'danger' : (j.urgent ? 'urgent' : '');
              return (
                <tr key={j.id} className={rowTone ? `gw-board-row-${rowTone}` : ''} onClick={isAdmin ? () => navigate('order-detail', { id: j.id }) : undefined}>
                  <td className="mono gw-board-id"><strong>#{j.id}</strong></td>
                  <td>
                    <span className={`pill pill-${U.WORK_TYPE_TONES[j.workType] || 'slate'}`}>{D.WORK_TYPE_LABELS[j.workType]}</span>
                  </td>
                  <td title={j.topic}>
                    <div className="gw-board-title-cell">{j.topic}</div>
                  </td>
                  <td className="text-muted fs-12">{j.field || <span className="text-faint">—</span>}</td>
                  <td className="num mono">{j.pages ?? <span className="text-faint">—</span>}</td>
                  <td>
                    <div className="gw-board-date">
                      <span className="mono">{U.fmtDate(j.deadline)}</span>
                      <span className={`gw-board-deadline-meta is-${dm.tone}`}>
                        {j.urgent && <Icon name="flame" size={10}/>} {dm.label}{j.urgent ? ` · ×${j.factor}` : ''}
                      </span>
                    </div>
                  </td>
                  <td className="mono gw-board-small">{j.interimDeadline ? U.fmtDate(j.interimDeadline) : <span className="text-faint">—</span>}</td>
                  <td className="num mono strong gw-board-money">{U.EUR(j.honorEur)}</td>
                  {isAdmin && <td className="num mono">{U.EUR(j.grossEur)}</td>}
                  {isAdmin && (
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar initials={cust?.initials || '??'} size={22} tone="blue"/>
                        <span className="fs-12">{cust?.name || '—'}</span>
                      </div>
                    </td>
                  )}
                  <td onClick={(e) => e.stopPropagation()} className="num">
                    {isAdmin ? (
                      <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-sm" onClick={() => navigate('order-detail', { id: j.id })} title="Auftrag öffnen">
                          <Icon name="eye" size={12}/>
                        </button>
                        <button type="button" className="btn btn-sm" onClick={() => onUnpublish(j.id)} title="Vom Board nehmen">
                          <Icon name="x" size={12}/>
                        </button>
                      </div>
                    ) : j.assignmentMode === 'job_board' && j.jobBoardStatus === 'open' ? (
                      hasMyApplication(j.id) ? (
                        <button type="button" className="btn btn-sm gw-board-row-action" disabled>
                          <Icon name="clock" size={12}/> Gesendet
                        </button>
                      ) : (
                        <button type="button" className="btn btn-sm btn-primary gw-board-row-action" onClick={() => onApply(j.id)}>
                          <Icon name="send" size={12}/> Bewerben
                        </button>
                      )
                    ) : (
                      <button type="button" className="btn btn-sm btn-success gw-board-row-action" onClick={() => setClaimingId(j.id)}>
                        <Icon name="check" size={12}/> Annehmen
                      </button>
                    )}
                  </td>
                  <td className="gw-board-note-cell">
                    {j.adminNote ? (
                      <div title={j.adminNote}>{j.adminNote}</div>
                    ) : <span className="text-faint">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
            </table>
          </div>
        </div>
      </section>
      {!isAdmin && claimingId && <ClaimModal job={unclaimed.find(j => j.id === claimingId)} gwId={currentGwId} onClose={() => setClaimingId(null)} toast={toast} navigate={navigate}/>}
    </div>
  );
}

function ClaimModal({ job, gwId, onClose, toast, navigate }) {
  const [step, setStep] = useState(1);
  const [acks, setAcks] = useState({ agb: false, ai: false, gdpr: false, deadline: false, fee: false, individual: false });
  const allAcked = Object.values(acks).every(Boolean);
  const submit = () => {
    EFActions.gw.claimJob(job.id, gwId);
    onClose();
    toast({
      tone: 'info',
      transition: { entity: `Order #${job.id}`, from: 'On Job Board', to: 'GW Claimed — Approve' },
      text: '6 acknowledgements signed · awaiting admin approval',
    });
    setTimeout(() => navigate('gw-active'), 400);
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Claim Job #{job.id}</div>
            <div className="text-faint fs-11 mt-1">Step {step} of 2 · acknowledgements</div>
          </div>
          <button className="btn btn-sm" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        <div className="modal-body">
          {step === 1 ? (
            <>
              <div className="kv">
                <div className="kv-row"><dt>Type</dt><dd>{D.WORK_TYPE_LABELS[job.workType]}</dd></div>
                <div className="kv-row"><dt>Field</dt><dd>{job.field}</dd></div>
                <div className="kv-row"><dt>Pages</dt><dd className="mono">{job.pages}</dd></div>
                <div className="kv-row"><dt>Final deadline</dt><dd className="mono">{U.fmtDate(job.deadline)}, 18:00</dd></div>
                <div className="kv-row"><dt>Topic</dt><dd>{job.topic}</dd></div>
                <div className="kv-row"><dt>Your honorarium</dt><dd className="mono strong" style={{ color: 'var(--green)', fontSize: 16 }}>{U.EUR(job.honorEur)}</dd></div>
                <div className="kv-row"><dt>Released after</dt><dd>final delivery + customer accepts + payment cleared (next Friday)</dd></div>
              </div>
              <div className="banner danger mt-3" style={{ fontSize: 12 }}>
                <Icon name="alert-triangle" size={14}/>
                <div>
                  <strong>Important:</strong> Claim is <em>provisional</em> until admin approves. Customer details and platform chat unlock only after approval. AGB v3.2 applies.
                </div>
              </div>
            </>
          ) : (
            <div className="flex-col gap-2">
              {[
                { k: 'agb', label: 'I have read and accept the AGB v3.2 (effective 01.04.2026), including kill-fee schedule & confidentiality.' },
                { k: 'ai', label: 'I will NOT use AI tools (ChatGPT, Claude, Gemini, etc.) to generate any part of the work. Per AGB v3.2 §5, any AI use is fraud — exclusion from the platform and forfeit of payment. The AI score is investigative evidence, not a tolerated threshold.' },
                { k: 'gdpr', label: 'I will not store or share customer data outside efactory1 platform. GDPR Art. 28 applies.' },
                { k: 'deadline', label: 'I commit to the final deadline ' + U.fmtDate(job.deadline) + ' 18:00 — late delivery triggers fee reduction.' },
                { k: 'fee', label: 'I accept the honorarium of ' + U.EUR(job.honorEur) + ' as full and final compensation, paid after release gate clears.' },
                { k: 'individual', label: 'I confirm this is an Individual-Werk (Werkvertrag) and I am not employed by efactory1 GmbH.' },
              ].map(a => (
                <label key={a.k} className="flex items-start gap-2" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: acks[a.k] ? 'color-mix(in oklab, var(--green) 5%, var(--surface))' : 'var(--surface)' }}>
                  <input type="checkbox" checked={acks[a.k]} onChange={() => setAcks({ ...acks, [a.k]: !acks[a.k] })} style={{ marginTop: 2 }}/>
                  <span className="fs-12">{a.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          {step === 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(2)}>Continue to acknowledgements →</button>
          ) : (
            <button className="btn btn-success" disabled={!allAcked} onClick={submit}><Icon name="check" size={14}/> Submit claim · {U.EUR(job.honorEur)}</button>
          )}
        </div>
      </div>
    </div>
  );
}

export { GWJobBoard };
