// GW · Onboarding flow — IBAN, tax ID, AGB acceptance for new ghostwriters.

// ====================================================================
// GW — Onboarding wizard (form 7880 → platform)
// ====================================================================
import React, { useState as useStateA, useEffect as useEffectA, useMemo as useMemoA } from 'react';
import { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, NotReady, PlannedTag, EmptyState, Skeleton } from '../../utils.jsx';
import * as U from '../../utils.jsx';
import { CrumbBar } from '../../shell.jsx';
import EF from '../core/ef.js';
const D = EF;

function GWOnboarding({ navigate, toast }) {
  const [step, setStep] = useStateA(0);
  const [draft, setDraft] = useStateA({
    firstName: 'Isabel', lastName: 'Walter',
    phone: '+49 ', email: 'isabel.walter@gw.efactory1.de',
    expertise: ['Wirtschaftsinformatik', 'BWL'],
    languages: ['DE', 'EN'],
    avail: 'Mo–Fr 18–23',
    iban: '', taxId: '',
    agbsAccepted: false, contractSigned: false, gdprAccepted: false,
  });
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const steps = [
    { id: 'profile', label: 'Profile', icon: 'user' },
    { id: 'expertise', label: 'Expertise', icon: 'feather' },
    { id: 'banking', label: 'Banking', icon: 'wallet' },
    { id: 'agbs', label: 'AGB & contract', icon: 'file-text' },
    { id: 'done', label: 'Submit', icon: 'check-circle' },
  ];
  const canNext = (() => {
    if (step === 0) return draft.firstName && draft.lastName && draft.phone.length > 5;
    if (step === 1) return draft.expertise.length > 0 && draft.languages.length > 0;
    if (step === 2) return draft.iban.length >= 6 && draft.taxId.length >= 6;
    if (step === 3) return draft.agbsAccepted && draft.contractSigned && draft.gdprAccepted;
    return true;
  })();
  const finish = () => {
    toast({ text: 'Onboarding submitted · Berat will review · confirmation email follows when approved', tone: 'success' });
    setTimeout(() => navigate('gw-profile'), 600);
  };
  const expTags = ['BWL','Marketing','Personal','VWL','Wirtschaftsinformatik','Informatik','ML','Soziologie','Pädagogik','Jura','Mode','Statistik','Maschinenbau','Bauingenieurwesen','Psychologie','Medizin','Architektur'];
  const langTags = ['DE','EN','FR','TR','ES','SR','RU','IT'];

  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome — onboarding</h1>
          <div className="page-subtitle">5 steps · replaces /ghostwriter-onboarding/ form 7880</div>
        </div>
      </div>

      <div className="card mb-3"><div className="card-pad flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 8 }}>
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2" style={{ flex: 1, minWidth: 100 }}>
            <div style={{ width: 26, height: 26, borderRadius: 13, background: step > i ? 'var(--green)' : step === i ? 'var(--blue)' : 'var(--surface-2)', color: step >= i ? 'white' : 'var(--text-3)', display: 'grid', placeItems: 'center' }}>
              {step > i ? <Icon name="check" size={12}/> : <span className="fs-11 strong">{i+1}</span>}
            </div>
            <span className={`fs-11 ${step === i ? 'strong' : 'text-faint'}`} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: step > i ? 'var(--green)' : 'var(--border)' }}/>}
          </div>
        ))}
      </div></div>

      {step === 0 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="field"><label>First name</label><input value={draft.firstName} onChange={e => set('firstName', e.target.value)}/></div>
            <div className="field"><label>Last name</label><input value={draft.lastName} onChange={e => set('lastName', e.target.value)}/></div>
            <div className="field"><label>Email</label><input value={draft.email} onChange={e => set('email', e.target.value)}/></div>
            <div className="field"><label>Phone</label><input value={draft.phone} onChange={e => set('phone', e.target.value)}/></div>
            <div className="field" style={{ gridColumn: '1 / -1' }}><label>Availability hours</label><input value={draft.avail} onChange={e => set('avail', e.target.value)} placeholder="Mo–Fr 18–23"/></div>
          </div>
        </div></div>
      )}

      {step === 1 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div>
            <div className="text-faint fs-11 mb-2">Expertise tags <span className="text-faint">— Berat assigns based on these</span></div>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {expTags.map(t => {
                const on = draft.expertise.includes(t);
                return <button type="button" key={t} className={`chip ${on ? 'active' : ''}`} onClick={() => set('expertise', on ? draft.expertise.filter(x => x !== t) : [...draft.expertise, t])}>{t}</button>;
              })}
            </div>
          </div>
          <div>
            <div className="text-faint fs-11 mb-2">Languages</div>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {langTags.map(t => {
                const on = draft.languages.includes(t);
                return <button type="button" key={t} className={`chip ${on ? 'active' : ''}`} onClick={() => set('languages', on ? draft.languages.filter(x => x !== t) : [...draft.languages, t])}>{t}</button>;
              })}
            </div>
          </div>
        </div></div>
      )}

      {step === 2 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner info" style={{ fontSize: 11.5 }}>
            <Icon name="lock" size={12}/>
            <span>Banking is encrypted at rest · used only for SEPA payouts every Friday after the release gate clears.</span>
          </div>
          <div className="field"><label>IBAN</label><input value={draft.iban} onChange={e => set('iban', e.target.value)} placeholder="DE…"/></div>
          <div className="field"><label>Tax ID (Steuernummer)</label><input value={draft.taxId} onChange={e => set('taxId', e.target.value)} placeholder="XX/XXX/XXXXX"/></div>
          <div className="banner" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', fontSize: 11.5 }}>
            <Icon name="zap" size={12}/>
            <span><strong>Honorar invoice address (always):</strong> Bery Ventures GmbH · c/o WeWork Friesenplatz 4 · 50672 Köln</span>
          </div>
        </div></div>
      )}

      {step === 3 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner warn" style={{ fontSize: 12 }}>
            <Icon name="alert-triangle" size={14}/>
            <span>You'll re-confirm key clauses on every job claim. These are the foundational terms.</span>
          </div>
          {[
            { k: 'agbsAccepted', l: 'AGB v3.2 (effective 01.04.2026) — kill-fee schedule, confidentiality, response SLA' },
            { k: 'contractSigned', l: 'Werkvertrag (Individual-Werk) — freelance, not employment · GW responsible for own taxes & invoicing' },
            { k: 'gdprAccepted', l: 'GDPR — confidential customer data · delete after assignment completion' },
          ].map(c => (
            <label key={c.k} className="flex items-start gap-2" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', background: draft[c.k] ? 'color-mix(in oklab, var(--green) 5%, var(--surface))' : 'var(--surface)' }}>
              <input type="checkbox" checked={draft[c.k]} onChange={e => set(c.k, e.target.checked)} style={{ marginTop: 2 }}/>
              <span className="fs-12">{c.l}</span>
            </label>
          ))}
        </div></div>
      )}

      {step === 4 && (
        <div className="card"><div className="card-pad flex-col gap-3">
          <div className="banner success">
            <Icon name="check-circle" size={14}/>
            <div><strong>Ready to submit.</strong> Berat reviews onboarding within ~24h · you'll receive a confirmation email when approved · jobs from the board will start matching your expertise tags.</div>
          </div>
          <div className="kv" style={{ fontSize: 12 }}>
            <div className="kv-row"><dt>Name</dt><dd>{draft.firstName} {draft.lastName}</dd></div>
            <div className="kv-row"><dt>Expertise</dt><dd>{draft.expertise.join(', ')}</dd></div>
            <div className="kv-row"><dt>Languages</dt><dd>{draft.languages.join(', ')}</dd></div>
            <div className="kv-row"><dt>Banking</dt><dd className="mono">{draft.iban.slice(0, 4)}•••• · Tax {draft.taxId.slice(0, 3)}•••</dd></div>
            <div className="kv-row"><dt>AGB / Werkvertrag / GDPR</dt><dd><span className="pill pill-green"><Icon name="check" size={10}/> All accepted</span></dd></div>
          </div>
        </div></div>
      )}

      <div className="flex justify-between mt-3">
        <button type="button" className="btn" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}><Icon name="chevron-left" size={14}/> Back</button>
        {step < steps.length - 1 ? (
          <button type="button" className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext}>Continue <Icon name="chevron-right" size={14}/></button>
        ) : (
          <button type="button" className="btn btn-success" onClick={finish}><Icon name="check" size={14}/> Submit onboarding</button>
        )}
      </div>
    </div>
  );
}

export { GWOnboarding };
