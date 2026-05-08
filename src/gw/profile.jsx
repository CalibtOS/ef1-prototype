// GW · Profile — expertise, languages, AGB version, signed PDF.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ GW PROFILE ============
function GWProfile() {
  const me = D.GW_ME;
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <div className="page-subtitle">Account, banking and freelance contract</div>
        </div>
        <div className="page-actions">
          <NotReady className="btn" feature="edit-record" label="Edit ghostwriter"><Icon name="edit" size={14}/> Edit</NotReady>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="card">
          <div className="card-head"><div className="card-title">Personal info</div></div>
          <div className="card-pad flex items-center gap-3 mb-3">
            <Avatar initials={me.initials} size={56} tone="blue"/>
            <div className="flex-col" style={{ lineHeight: 1.3 }}>
              <span className="strong" style={{ fontSize: 16 }}>{me.name}</span>
              <span className="text-faint fs-11 mono">{me.email}</span>
              <span className="text-faint fs-11 mono">{me.phone}</span>
            </div>
          </div>
          <div className="kv">
            <div className="kv-row"><dt>Languages</dt><dd>{(me.languages||[]).join(' · ')}</dd></div>
            <div className="kv-row"><dt>Availability</dt><dd className="mono">{me.avail || 'Mo–Fr 18–23'}</dd></div>
            <div className="kv-row"><dt>Member since</dt><dd className="mono">2024-08-12</dd></div>
            <div className="kv-row"><dt>Lifetime jobs</dt><dd className="mono">{me.lifetime} · ★ {me.rating?.toFixed(1)} · {Math.round((me.onTime||0)*100)}% on-time</dd></div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Expertise</div><NotReady className="btn btn-sm" feature="expertise-tag"><Icon name="plus" size={12}/> Tag</NotReady></div>
          <div className="card-pad">
            <div className="flex gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
              {(me.expertise||[]).map(e => <span key={e} className="pill pill-blue">{e}</span>)}
            </div>
            <div className="text-muted fs-11">Berat assigns jobs based on these tags — keep them precise.</div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Banking (Honorar payouts)</div><span className="pill pill-green"><Icon name="check" size={10}/> Verified</span></div>
          <div className="card-pad">
            <div className="kv">
              <div className="kv-row"><dt>IBAN</dt><dd className="mono">{me.iban || 'DE•• •••• •••• •••• ••••'}</dd></div>
              <div className="kv-row"><dt>Tax ID (Steuernummer)</dt><dd className="mono">{me.taxId || '••/•••/•••••'}</dd></div>
              <div className="kv-row"><dt>Invoice prefix</dt><dd className="mono">IW-2026-•••</dd></div>
            </div>
            <div className="banner info mt-3" style={{ fontSize: 11.5 }}>
              <Icon name="lock" size={12}/>
              <span>Bank details are masked. Click Edit to reveal & change. Payouts are SEPA · 1–3 business days.</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><div className="card-title">Freelance contract / AGB</div><span className="pill pill-green">Signed</span></div>
          <div className="card-pad">
            <div className="kv">
              <div className="kv-row"><dt>Current version</dt><dd className="mono">{me.agbsVersion || 'v3.2'}</dd></div>
              <div className="kv-row"><dt>Signed at</dt><dd className="mono">{U.fmtDate(me.agbsAt || '2025-09-12')}</dd></div>
              <div className="kv-row"><dt>Werkvertrag</dt><dd>Individual-Werk · not employment</dd></div>
            </div>
            <NotReady className="btn btn-sm mt-3" feature="agb-download"><Icon name="download" size={12}/> Download signed PDF</NotReady>
          </div>
        </div>
      </div>
    </div>
  );
}
window.GWProfile = GWProfile;

window.GWProfile = GWProfile;
})();
