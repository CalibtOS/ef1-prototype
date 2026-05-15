// Admin · New-order wizard — guided order creation across 4 steps.

import React, { useState as useStateA, useEffect as useEffectA, useMemo as useMemoA } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import EFActions from '../core/actions.js';
import EF from '../core/ef.js';
const D = EF;

function initialsFor(name, email) {
  const text = String(name || email || '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.map(part => part[0]).join('').slice(0, 2).toUpperCase();
  return text.slice(0, 2).toUpperCase() || 'CU';
}

// ====================================================================
function OrderNewWizard({ navigate, toast }) {
  const [step, setStep] = useStateA(0);
  const [draft, setDraft] = useStateA({
    customerId: null,
    customerName: '', customerEmail: '', customerPhone: '', country: 'DE',
    workType: 'hausarbeit', field: '', pages: 14, paperTitle: '',
    finalDeadline: '', interimMode: 'auto',
    rate: 0.40, deadlineFactor: 1.0, discount: 0, installments: 1,
    notes: '', leadSource: 'ws1',
  });

  const setField = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const pricePerPage = { hausarbeit: 49, bachelorarbeit: 59, masterarbeit: 69, doktorarbeit: 79 };
  const ppp = pricePerPage[draft.workType] || 49;
  const grossEur = +(draft.pages * ppp * draft.deadlineFactor * (1 - draft.discount)).toFixed(2);
  const netHonor = +((grossEur / 1.07) * draft.rate).toFixed(2);
  const margin = +((grossEur / 1.07) - netHonor).toFixed(2);

  const fmtDateInput = (d) => d ? new Date(d).toISOString().slice(0, 10) : '';
  const todayPlus = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
  const interimDates = () => {
    if (!draft.finalDeadline) return [];
    const today = new Date();
    const final = new Date(draft.finalDeadline);
    const diffMs = final.getTime() - today.getTime();
    if (diffMs <= 0) return [];
    if (draft.pages <= 20) {
      return [new Date(today.getTime() + diffMs * 0.5).toISOString().slice(0, 10)];
    }
    return [
      new Date(today.getTime() + diffMs * 0.3).toISOString().slice(0, 10),
      new Date(today.getTime() + diffMs * 0.6).toISOString().slice(0, 10),
    ];
  };
  const interims = interimDates();

  const customerCandidates = D.CUSTOMERS.filter(c => {
    if (!draft.customerName) return false;
    const q = draft.customerName.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  }).slice(0, 4);

  const steps = [
    { id: 'customer', label: 'Customer', icon: 'user' },
    { id: 'work', label: 'Work spec', icon: 'file-text' },
    { id: 'pricing', label: 'Pricing', icon: 'euro' },
    { id: 'deadlines', label: 'Deadlines', icon: 'calendar' },
    { id: 'notes', label: 'Notes', icon: 'edit' },
    { id: 'confirm', label: 'Confirm', icon: 'check-circle' },
  ];
  const canNext = (() => {
    if (step === 0) return draft.customerName.trim() && draft.customerEmail.trim();
    if (step === 1) return draft.field.trim() && draft.pages > 0;
    if (step === 2) return draft.rate >= 0.33 && draft.rate <= 0.62;
    if (step === 3) return !!draft.finalDeadline;
    return true;
  })();

  const create = () => {
    const newId = 9100 + Math.floor((D.ORDERS.length + Date.now()) % 900);
    const customerId = draft.customerId || ('c-new-' + newId);
    const newCustomer = draft.customerId ? null : {
      id: customerId,
      initials: initialsFor(draft.customerName, draft.customerEmail),
      name: draft.customerName.trim(),
      email: draft.customerEmail.trim(),
      phone: draft.customerPhone.trim(),
      country: draft.country,
      leadSource: draft.leadSource,
      tags: [],
    };
    const newOrder = {
      id: newId,
      status: 'qualified',
      customerId,
      ...(newCustomer ? { customer: newCustomer } : {}),
      workType: draft.workType,
      title: draft.paperTitle || 'folgt',
      titleTBD: !draft.paperTitle,
      field: draft.field,
      pages: draft.pages,
      finalDeadline: draft.finalDeadline + 'T18:00:00',
      interimDeadline: interims[0] ? interims[0] + 'T18:00:00' : null,
      interim2Deadline: interims[1] ? interims[1] + 'T18:00:00' : null,
      grossEur, netHonorarium: netHonor, rate: draft.rate,
      gwId: null,
      leadSource: draft.leadSource,
      createdAt: new Date().toISOString().slice(0, 10),
      acceptedAt: null,
      paidEur: 0,
      outstandingEur: 0,
      installments: [],
      revisionRounds: 0,
      note: draft.notes,
      _synthetic: true,
    };
    EFActions.orders.create(newOrder);
    toast && toast({
      text: `Order #${newId} created · Pipedrive deal Qualifiziert · Sevdesk contact created`,
      tone: 'success',
    });
    setTimeout(() => navigate('order-detail', { id: newId }), 600);
  };

  return (
    <div className="page" style={{ maxWidth: 920, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Orders', 'New']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Create order — manual entry</h1>
          <div className="page-subtitle">For off-form / WhatsApp customers · Pipedrive deal will be created on save · D-09 guest flow</div>
        </div>
        <div className="page-actions">
          <button type="button" className="btn" onClick={() => navigate('orders')}><Icon name="x" size={14}/> Cancel</button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-pad flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 8 }}>
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2" style={{ flex: 1, minWidth: 130 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 14,
                background: step > i ? 'var(--green)' : step === i ? 'var(--blue)' : 'var(--surface-2)',
                color: step >= i ? 'white' : 'var(--text-3)',
                display: 'grid', placeItems: 'center', flexShrink: 0,
              }}>
                {step > i ? <Icon name="check" size={14}/> : <span className="fs-12 strong">{i+1}</span>}
              </div>
              <div className="flex-col" style={{ lineHeight: 1.15, minWidth: 0 }}>
                <span className={`fs-11 ${step === i ? 'strong' : 'text-faint'}`} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: step > i ? 'var(--green)' : 'var(--border)' }}/>}
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner info" style={{ fontSize: 12 }}>
            <Icon name="zap" size={14}/>
            <span>Search Pipedrive by name or email. New customers create a Pipedrive Person + Sevdesk Contact on save.</span>
          </div>
          <div className="field"><label>Full name</label>
            <input value={draft.customerName} onChange={e => { setField('customerName', e.target.value); setField('customerId', null); }} placeholder="Erika Mustermann"/>
          </div>
          {customerCandidates.length > 0 && !draft.customerId && (
            <div className="card-pad" style={{ background: 'var(--surface-2)', borderRadius: 8, padding: 8 }}>
              <div className="text-faint fs-11 mb-2">Pipedrive matches</div>
              {customerCandidates.map(c => (
                <button type="button" key={c.id} className="action-row" style={{ marginBottom: 4 }} onClick={() => {
                  setField('customerId', c.id);
                  setField('customerName', c.name);
                  setField('customerEmail', c.email);
                  setField('customerPhone', c.phone);
                  setField('country', c.country || 'DE');
                  setField('leadSource', c.leadSource || 'ws1');
                }}>
                  <Avatar initials={c.initials} size={28}/>
                  <div className="flex-col" style={{ flex: 1, lineHeight: 1.25, textAlign: 'left' }}>
                    <span className="strong fs-12">{c.name}</span>
                    <span className="text-faint fs-11 mono">{c.email} · {c.country}{c.tags?.includes('VIP') ? ' · VIP' : ''}</span>
                  </div>
                  <span className="pill pill-blue" style={{ fontSize: 10 }}>Use</span>
                </button>
              ))}
            </div>
          )}
          {draft.customerId && (
            <div className="banner success" style={{ fontSize: 12 }}>
              <Icon name="check" size={14}/>
              <span>Linked to existing Pipedrive contact <strong>{draft.customerName}</strong></span>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Email</label>
              <input value={draft.customerEmail} onChange={e => setField('customerEmail', e.target.value)} placeholder="erika@example.com" type="email"/>
            </div>
            <div className="field"><label>Phone</label>
              <input value={draft.customerPhone} onChange={e => setField('customerPhone', e.target.value)} placeholder="+49 …"/>
            </div>
            <div className="field"><label>Country</label>
              <select value={draft.country} onChange={e => setField('country', e.target.value)}>
                <option value="DE">DE — Germany</option><option value="AT">AT — Austria</option><option value="CH">CH — Switzerland</option>
              </select>
            </div>
            <div className="field"><label>Lead source</label>
              <select value={draft.leadSource} onChange={e => setField('leadSource', e.target.value)}>
                <option value="ef1">ef1 — Website (direct)</option>
                <option value="ws1">ws1 — WhatsApp</option>
                <option value="ig">ig — Instagram</option>
                <option value="referral">referral — Word of mouth</option>
                <option value="b1">b1 — Review platform</option>
                <option value="ebay">ebay — eBay Kleinanzeigen</option>
              </select>
            </div>
          </div>
        </div></div>
      )}

      {step === 1 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Work type</label>
              <select value={draft.workType} onChange={e => setField('workType', e.target.value)}>
                {Object.entries(D.WORK_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field"><label>Pages (Seitenanzahl)</label>
              <input type="number" min="1" value={draft.pages} onChange={e => setField('pages', +e.target.value || 1)}/>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>Field of study (Fachbereich)</label>
              <input value={draft.field} onChange={e => setField('field', e.target.value)} placeholder="z.B. Wirtschaftsinformatik"/>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>Paper title (Titel der Arbeit) <span className="text-faint">— optional, can be "folgt"</span></label>
              <input value={draft.paperTitle} onChange={e => setField('paperTitle', e.target.value)} placeholder="Leer lassen für „folgt — awaiting customer"/>
            </div>
          </div>
        </div></div>
      )}

      {step === 2 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner info" style={{ fontSize: 12 }}>
            <Icon name="euro" size={14}/>
            <span>Gross = Pages × Price/page × Deadline factor. VAT 7% educational. GW rate locked at assignment.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>Price per page (gross, incl. 7% VAT)</label>
              <input value={`${ppp} €`} disabled style={{ background: 'var(--surface-2)' }}/>
            </div>
            <div className="field"><label>Deadline factor</label>
              <select value={draft.deadlineFactor} onChange={e => setField('deadlineFactor', +e.target.value)}>
                <option value="1.0">1.0× (≥72h)</option>
                <option value="1.25">1.25× (48–72h)</option>
                <option value="1.5">1.5× (24–48h)</option>
                <option value="2.0">2.0× (&lt;24h)</option>
              </select>
            </div>
            <div className="field"><label>Discount (full upfront)</label>
              {/* Per business_rules §2: 10% discount applies ONLY to a single full-upfront payment.
                  When installments > 1 the discount option is locked out. */}
              <select
                value={draft.discount}
                onChange={e => {
                  const v = +e.target.value;
                  setField('discount', v);
                  if (v > 0 && draft.installments !== 1) setField('installments', 1);
                }}
                disabled={draft.installments > 1}
                title={draft.installments > 1 ? 'Discount applies only to single-payment orders. Switch to 1 installment to enable.' : null}
              >
                <option value="0">No discount</option>
                <option value="0.10">10% (full upfront only — §2)</option>
              </select>
            </div>
            <div className="field"><label>Installments</label>
              <select
                value={draft.installments}
                onChange={e => {
                  const n = +e.target.value;
                  setField('installments', n);
                  if (n > 1 && draft.discount > 0) setField('discount', 0);
                }}
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} × {U.EUR(grossEur / n)}{n > 1 && draft.discount > 0 ? ' · disables discount' : ''}</option>)}
              </select>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label>GW rate <span className="text-faint">— typical 33–62% of net (peak 40%)</span></label>
              <input type="range" min="33" max="62" step="1" value={Math.round(draft.rate * 100)} onChange={e => setField('rate', +e.target.value / 100)}/>
              <div className="flex justify-between fs-11 mono mt-1"><span>33%</span><span className="strong">{Math.round(draft.rate * 100)}%</span><span>62%</span></div>
            </div>
          </div>
          <div className="card-pad" style={{ background: 'var(--surface-2)', borderRadius: 8 }}>
            <div className="kv">
              <div className="kv-row"><dt>Gross (Brutto)</dt><dd className="mono strong">{U.EUR(grossEur)}</dd></div>
              <div className="kv-row"><dt>Net (after 7% VAT)</dt><dd className="mono">{U.EUR(grossEur / 1.07)}</dd></div>
              <div className="kv-row"><dt>GW Honorar ({Math.round(draft.rate * 100)}%)</dt><dd className="mono" style={{ color: 'var(--green)' }}>{U.EUR(netHonor)}</dd></div>
              <div className="kv-row"><dt>Margin</dt><dd className="mono strong">{U.EUR(margin)}</dd></div>
            </div>
          </div>
        </div></div>
      )}

      {step === 3 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner info" style={{ fontSize: 12 }}>
            <Icon name="calendar" size={14}/>
            <span>Cutoff is 18:00 the day BEFORE the due date. Interim deadlines auto-compute from page count: ≤20 pages → 1 interim at 50%; &gt;20 pages → 2 interims at 30% / 60%.</span>
          </div>
          <div className="field"><label>Customer final deadline</label>
            <input type="date" value={draft.finalDeadline} onChange={e => setField('finalDeadline', e.target.value)} min={todayPlus(1)}/>
          </div>
          {interims.length > 0 && (
            <div className="card-pad" style={{ background: 'var(--surface-2)', borderRadius: 8 }}>
              <div className="text-faint fs-11 mb-2">Auto-computed Teillieferungen ({draft.pages} pages → {draft.pages <= 20 ? '1 interim' : '2 interims'})</div>
              {interims.map((d, i) => (
                <div key={i} className="flex items-center gap-2" style={{ padding: 6 }}>
                  <Icon name="file-text" size={12} className="text-muted"/>
                  <span className="fs-12 strong">Zwischenstand {i + 1}</span>
                  <span style={{ flex: 1 }}/>
                  <span className="mono fs-12">{U.fmtDate(d)}, 18:00</span>
                </div>
              ))}
              <div className="flex items-center gap-2" style={{ padding: 6, borderTop: '1px dashed var(--border)', marginTop: 4 }}>
                <Icon name="check-circle" size={12} className="text-success"/>
                <span className="fs-12 strong">Final delivery</span>
                <span style={{ flex: 1 }}/>
                <span className="mono fs-12">{U.fmtDate(draft.finalDeadline)}, 18:00</span>
              </div>
            </div>
          )}
        </div></div>
      )}

      {step === 4 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="field"><label>Internal note for GW (Weitere Notiz von efactory1.de)</label>
            <textarea value={draft.notes} onChange={e => setField('notes', e.target.value)} placeholder="z.B. IU Fallstudie · APA-Zitierweise · Kapitel 3 mit Praxisbeispielen aus dem Maschinenbau" style={{ width: '100%', minHeight: 100, border: '1px solid var(--border)', borderRadius: 8, padding: 10, fontFamily: 'inherit', fontSize: 12, resize: 'vertical', background: 'var(--surface)' }}/>
          </div>
          <div className="banner info" style={{ fontSize: 11.5 }}>
            <Icon name="paperclip" size={14}/>
            <span>Outline / Exposé attachments will be uploadable from the order detail screen after creation.</span>
          </div>
        </div></div>
      )}

      {step === 5 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner success" style={{ fontSize: 12 }}>
            <Icon name="zap" size={14}/>
            <div>
              <strong>On Save, the platform will:</strong>
              <ol style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 11.5 }}>
                <li>Create platform Order #{draft.customerId ? '[generated]' : '[new]'}</li>
                <li>{draft.customerId ? 'Link to existing Pipedrive Person' : 'Create Pipedrive Person + set marketing_status = subscribed'}</li>
                <li>Create Pipedrive Deal in stage <strong>Qualifiziert</strong></li>
                <li>{draft.customerId ? 'Reuse Sevdesk Contact' : 'Create Sevdesk Contact'}</li>
                <li>Order ready for <strong>"Generate offer"</strong> next</li>
              </ol>
            </div>
          </div>
          <div className="card-pad" style={{ background: 'var(--surface-2)', borderRadius: 8 }}>
            <div className="kv">
              <div className="kv-row"><dt>Customer</dt><dd>{draft.customerName} <span className="text-faint">· {draft.customerEmail}</span></dd></div>
              <div className="kv-row"><dt>Work</dt><dd>{D.WORK_TYPE_LABELS[draft.workType]} · {draft.pages} pages · {draft.field}</dd></div>
              <div className="kv-row"><dt>Paper title</dt><dd>{draft.paperTitle || <em className="text-faint">folgt — awaiting customer</em>}</dd></div>
              <div className="kv-row"><dt>Final deadline</dt><dd className="mono">{draft.finalDeadline ? U.fmtDate(draft.finalDeadline) + ', 18:00' : '—'}</dd></div>
              <div className="kv-row"><dt>Gross / GW Honorar / Margin</dt><dd className="mono">{U.EUR(grossEur)} / <span style={{ color: 'var(--green)' }}>{U.EUR(netHonor)}</span> / <strong>{U.EUR(margin)}</strong></dd></div>
              <div className="kv-row"><dt>Lead source</dt><dd>{draft.leadSource}</dd></div>
            </div>
          </div>
        </div></div>
      )}

      <div className="flex justify-between mt-3">
        <button type="button" className="btn" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
          <Icon name="chevron-left" size={14}/> Back
        </button>
        {step < steps.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext}>
            Continue <Icon name="chevron-right" size={14}/>
          </button>
        ) : (
          <button type="button" className="btn btn-success" onClick={create}>
            <Icon name="check" size={14}/> Create order · sync to Pipedrive + Sevdesk
          </button>
        )}
      </div>
    </div>
  );
}
window.OrderNewWizard = OrderNewWizard;

window.OrderNewWizard = OrderNewWizard;
