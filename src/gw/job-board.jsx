// GW · Job Board — applications board with admin perspective toggle. Includes BewerbungModal.

// ============ GW JOB BOARD ============
// Same surface, two perspectives: GW applies via the BewerbungModal (SOP 1
// Auftragsbedingungen + 6 acknowledgements); admin manages (no Bewerben button).
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
  const [applyingId, setApplyingId] = useState(null);
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
      topic: o.titleTBD ? 'Titel folgt — Briefing nach Zuweisung' : o.title,
      adminNote: o.gwBoardNote || o.offerNote || null,
      urgent: U.daysTo(o.finalDeadline) < 7,
      jobBoardStatus: o.jobBoardStatus,
      assignmentMode: o.assignmentMode,
    }));

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
                    ) : hasMyApplication(j.id) ? (
                      <button type="button" className="btn btn-sm gw-board-row-action" disabled>
                        <Icon name="clock" size={12}/> Gesendet
                      </button>
                    ) : (
                      <button type="button" className="btn btn-sm btn-primary gw-board-row-action" onClick={() => setApplyingId(j.id)}>
                        <Icon name="send" size={12}/> Bewerben
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
      {!isAdmin && applyingId && <BewerbungModal job={unclaimed.find(j => j.id === applyingId)} gwId={currentGwId} onClose={() => setApplyingId(null)} toast={toast} navigate={navigate}/>}
    </div>
  );
}

function BewerbungModal({ job, gwId, onClose, toast }) {
  const [step, setStep] = useState(1);
  const [acks, setAcks] = useState({ agb: false, ai: false, gdpr: false, deadline: false, fee: false, individual: false });
  const allAcked = Object.values(acks).every(Boolean);
  if (!job) return null;
  const submit = () => {
    const res = EFActions.gw.applyForJob(job.id, gwId, {
      pitch: 'Ich habe passende Expertise und melde mich heute beim Kunden.',
      termsAccepted: true,
      claimTermsAccepted: {
        agb: acks.agb,
        noAi: acks.ai,
        gdpr: acks.gdpr,
        deadline: acks.deadline,
        fee: acks.fee,
        individual: acks.individual,
        agbs: 'v3.2',
      },
    });
    onClose();
    if (res?.ok) {
      toast && toast({
        tone: 'success',
        transition: { entity: `Order #${job.id}`, from: 'On Job Board', to: 'Bewerbung eingereicht' },
        text: 'Bewerbung gesendet · Berat prüft alle Bewerbungen',
      });
    }
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Bewerbung · Auftrag #{job.id}</div>
            <div className="text-faint fs-11 mt-1">Schritt {step} von 2 · Auftragsbedingungen</div>
          </div>
          <button className="btn btn-sm" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        <div className="modal-body">
          {step === 1 ? (
            <>
              <div className="kv">
                <div className="kv-row"><dt>Art der Arbeit</dt><dd>{D.WORK_TYPE_LABELS[job.workType]}</dd></div>
                <div className="kv-row"><dt>Fachbereich</dt><dd>{job.field}</dd></div>
                <div className="kv-row"><dt>Seiten</dt><dd className="mono">{job.pages}</dd></div>
                <div className="kv-row"><dt>Finales Lieferdatum</dt><dd className="mono">{U.fmtDate(job.deadline)}, 18:00</dd></div>
                <div className="kv-row"><dt>Thema</dt><dd>{job.topic}</dd></div>
                <div className="kv-row"><dt>Ihr Honorar</dt><dd className="mono strong" style={{ color: 'var(--green)', fontSize: 16 }}>{U.EUR(job.honorEur)}</dd></div>
                <div className="kv-row"><dt>Auszahlung nach</dt><dd>Finallieferung + Kundenfreigabe + Zahlungseingang (Freitag-Batch)</dd></div>
              </div>
              <div className="banner danger mt-3" style={{ fontSize: 12 }}>
                <Icon name="alert-triangle" size={14}/>
                <div>
                  Ihre Bewerbung ist <strong>unverbindlich</strong>, bis efactory1 sie freigibt. Kundendaten und Chat erst nach Zuweisung. AGB v3.2 gelten nach Freigabe.
                </div>
              </div>
            </>
          ) : (
            <div className="flex-col gap-2">
              {[
                { k: 'agb', label: 'Ich habe die AGB v3.2 (gültig ab 01.04.2026) gelesen und akzeptiert — inkl. Kill-Fee-Staffelung und Vertraulichkeit.' },
                { k: 'ai', label: 'Ich werde KEINE KI-Tools (ChatGPT, Claude, Gemini etc.) einsetzen, um Teile der Arbeit zu erzeugen. Gemäß AGB v3.2 §5 gilt jede KI-Nutzung als Betrug — Ausschluss von der Plattform und Verfall der Vergütung. Der KI-Score ist Beweismittel, kein tolerierter Schwellenwert.' },
                { k: 'gdpr', label: 'Ich werde Kundendaten nicht außerhalb der efactory1-Plattform speichern oder weitergeben. DSGVO Art. 28 gilt.' },
                { k: 'deadline', label: 'Ich verpflichte mich zum finalen Liefertermin ' + U.fmtDate(job.deadline) + ' 18:00 — verspätete Lieferung führt zur Honorarkürzung.' },
                { k: 'fee', label: 'Ich akzeptiere das Honorar von ' + U.EUR(job.honorEur) + ' als volle und abschließende Vergütung, ausgezahlt nach Freigabe des Release-Gates.' },
                { k: 'individual', label: 'Ich bestätige, dass dies ein Individual-Werk (Werkvertrag) ist und ich nicht bei der efactory1 GmbH angestellt bin.' },
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
          <button className="btn" onClick={onClose}>Abbrechen</button>
          {step === 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(2)}>Weiter zu den Bestätigungen →</button>
          ) : (
            <button className="btn btn-success" disabled={!allAcked} onClick={submit}><Icon name="send" size={14}/> Bewerbung absenden · {U.EUR(job.honorEur)}</button>
          )}
        </div>
      </div>
    </div>
  );
}

export { GWJobBoard };
