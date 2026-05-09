// Admin · Ghostwriters list (GhostwriterDetail lives in ghostwriter-detail.jsx).
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ GHOSTWRITERS REGISTRY ============
function GhostwritersList({ navigate }) {
  const [search, setSearch] = useStateA('');
  const [filter, setFilter] = useStateA('all'); // all | active | banned | overloaded | free
  const all = window.EFHooks.useGhostwriters();

  const filtered = all.filter(g => {
    if (filter === 'banned' && !g.banned) return false;
    if (filter === 'active' && g.banned) return false;
    if (filter === 'overloaded' && (g.active || 0) < 4) return false;
    if (filter === 'free' && (g.active || 0) > 1) return false;
    if (search && !((g.name + ' ' + (g.expertise||[]).join(' ')).toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const capacity = (n) => n >= 5 ? 'overloaded' : n >= 3 ? 'busy' : n >= 1 ? 'available' : 'free';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['Admin', 'Ghostwriters']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>Ghostwriters</h1>
          <div className="page-subtitle">{all.length} active GWs · deduped from 258 sheet strings · last sync {U.relTime('2026-05-07T13:18:00')}</div>
        </div>
        <div className="page-actions">
          <NotReady className="btn" feature="export-csv"><Icon name="download" size={14}/> Export CSV</NotReady>
          <NotReady className="btn" feature="invite-gw"><Icon name="plus" size={14}/> Invite GW</NotReady>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3" style={{ flexWrap: 'wrap' }}>
        <div className="topbar-search" style={{ width: 280 }}>
          <Icon name="search" size={14} className="text-faint topbar-search-icon" aria-hidden/>
          <input type="search" placeholder="Search name or expertise…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search ghostwriters"/>
        </div>
        {[['all','All'],['active','Active'],['free','Available'],['overloaded','Overloaded'],['banned','Shadow-banned']].map(([v,l]) => (
          <button key={v} className={`chip ${filter===v?'active':''}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
        <span style={{ flex: 1 }}/>
        <span className="text-faint fs-12">{filtered.length} of {all.length}</span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Name</th>
              <th>Expertise</th>
              <th>Languages</th>
              <th className="num">Active</th>
              <th className="num">Lifetime</th>
              <th className="num">On-time</th>
              <th className="num">Rating</th>
              <th className="num">Rate</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(g => {
              const cap = capacity(g.active || 0);
              return (
                <tr key={g.id} style={{ cursor: 'pointer' }} onClick={() => navigate('ghostwriter-detail', { id: g.id })}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar initials={g.initials} size={28} tone={g.banned ? 'red' : (g.isOwner ? 'blue' : 'neutral')}/>
                      <div className="flex-col" style={{ lineHeight: 1.25 }}>
                        <span className="strong fs-12">{g.name}</span>
                        <span className="text-faint fs-11 mono">{g.email}</span>
                      </div>
                      {g.banned && <Icon name="alert-triangle" size={12} className="text-faint" />}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-1" style={{ flexWrap: 'wrap', maxWidth: 220 }}>
                      {(g.expertise || []).slice(0, 3).map(e => <span key={e} className="pill pill-slate" style={{ fontSize: 10.5 }}>{e}</span>)}
                      {(g.expertise || []).length > 3 && <span className="text-faint fs-11">+{g.expertise.length - 3}</span>}
                    </div>
                  </td>
                  <td className="mono fs-11 text-muted">{(g.languages || []).join(' · ')}</td>
                  <td className="num mono">
                    <span style={{ color: cap === 'overloaded' ? 'var(--red)' : cap === 'busy' ? 'var(--amber)' : 'var(--text)' }}>{g.active || 0}</span>
                  </td>
                  <td className="num mono text-muted">{g.lifetime || 0}</td>
                  <td className="num mono">
                    <span style={{ color: g.onTime >= 0.95 ? 'var(--green)' : g.onTime >= 0.85 ? 'var(--text)' : 'var(--red)' }}>
                      {g.onTime != null ? Math.round(g.onTime * 100) + '%' : '—'}
                    </span>
                  </td>
                  <td className="num mono">{g.rating ? '★ ' + g.rating.toFixed(1) : '—'}</td>
                  <td className="num mono">{g.rate != null ? Math.round(g.rate * 100) + '%' : <span className="text-faint">self</span>}</td>
                  <td>
                    {g.banned
                      ? <span className="pill pill-red" title={g.banReason}>Shadow-banned</span>
                      : g.isOwner
                        ? <span className="pill pill-blue">Owner</span>
                        : cap === 'overloaded'
                          ? <span className="pill pill-amber">Overloaded</span>
                          : cap === 'busy'
                            ? <span className="pill pill-slate">Busy</span>
                            : <span className="pill pill-green">Available</span>
                    }
                  </td>
                  <td className="num">
                    <button type="button" className="btn btn-sm" aria-label="Open profile" onClick={e => { e.stopPropagation(); navigate('ghostwriter-detail', { id: g.id }); }}><Icon name="chevron-right" size={12}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.find(g => g.banned) && (
        <div className="banner danger mt-3">
          <Icon name="alert-triangle" size={14}/>
          <span><strong>Anna König</strong> auto-shadow-banned by QA on Order #3517 — AI score 87%. All pending payments blocked. Reverse manually from her profile.</span>
        </div>
      )}
    </div>
  );
}

window.GhostwritersList = GhostwritersList;

window.GhostwritersList = GhostwritersList;
})();
