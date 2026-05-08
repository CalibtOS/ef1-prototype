// Dev · Tweaks panel — debug overlay for theme/density/locale/accent tweaks.
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ TWEAKS PANEL ============
function TweaksPanel({ tweaks, setTweak, onClose }) {
  return (
    <div className="modal-backdrop" style={{ alignItems: 'flex-start', justifyContent: 'flex-end', background: 'transparent', pointerEvents: 'none' }}>
      <div style={{ width: 320, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', margin: 16, marginTop: 76, pointerEvents: 'auto' }}>
        <div className="flex items-center justify-between" style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
          <strong style={{ fontSize: 13 }}>Tweaks</strong>
          <button className="btn btn-sm" onClick={onClose}><Icon name="x" size={14}/></button>
        </div>
        <div className="card-pad flex-col gap-3" style={{ fontSize: 12 }}>
          <div>
            <div className="text-muted mb-2">Theme</div>
            <div className="flex gap-1">
              {[['light','Light'],['dark','Dark'],['hc','High contrast']].map(([v,l]) => (
                <button key={v} className={`chip ${tweaks.theme===v?'active':''}`} onClick={() => setTweak('theme', v)} style={{ flex: 1, justifyContent: 'center' }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-muted mb-2">Density</div>
            <div className="flex gap-1">
              {[['compact','Compact'],['cozy','Cozy']].map(([v,l]) => (
                <button key={v} className={`chip ${tweaks.density===v?'active':''}`} onClick={() => setTweak('density', v)} style={{ flex: 1, justifyContent: 'center' }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-muted mb-2">Locale</div>
            <div className="flex gap-1">
              {[['de','Deutsch'],['en','English'],['both','Bilingual']].map(([v,l]) => (
                <button key={v} className={`chip ${tweaks.locale===v?'active':''}`} onClick={() => setTweak('locale', v)} style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-muted mb-2">Accent color</div>
            <div className="flex gap-2">
              {[
                { v: '#1F62F0', name: 'Blue' },
                { v: '#0F766E', name: 'Teal' },
                { v: '#7c3aed', name: 'Violet' },
                { v: '#DC2626', name: 'Red' },
                { v: '#0EA5E9', name: 'Sky' },
              ].map(c => (
                <button key={c.v} onClick={() => setTweak('accent', c.v)} title={c.name}
                  style={{ width: 28, height: 28, borderRadius: 14, background: c.v, border: tweaks.accent === c.v ? '2px solid var(--text)' : '2px solid var(--border)', cursor: 'pointer' }}/>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between" style={{ padding: '8px 0' }}>
            <span className="text-muted">Show debug overlay</span>
            <input type="checkbox" checked={tweaks.debug} onChange={e => setTweak('debug', e.target.checked)}/>
          </div>
          <div className="flex items-center justify-between" style={{ padding: '8px 0' }}>
            <span className="text-muted">Animate KPI counters</span>
            <input type="checkbox" checked={tweaks.animateCounters} onChange={e => setTweak('animateCounters', e.target.checked)}/>
          </div>
          <div className="banner info" style={{ fontSize: 11 }}>
            <Icon name="zap" size={12}/>
            <span>Tweaks persist live across the prototype.</span>
          </div>
        </div>
      </div>
    </div>
  );
}


window.TweaksPanel = TweaksPanel;
})();
