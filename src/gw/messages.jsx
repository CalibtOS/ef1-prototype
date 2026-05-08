// GW · Messages — anonymized customer threads (admin always CC).
;(function(){
const { useState: useStateA, useEffect: useEffectA, useMemo: useMemoA } = React;
const { Icon, StatusPill, Avatar, Money, Bi, ScoreBar, CrumbBar, NotReady, PlannedTag, EmptyState, Skeleton } = window;
const U = window.EFU;
const D = window.EF;

// ============ GW MESSAGES ============
function GWMessages({ navigate }) {
  const snippets = [
    { msg: 'Passt so — bitte mit Kapitel 3 weitermachen. Ich melde mich wieder zum Zwischenstand.', at: '2026-05-07T10:34:00', from: 'customer' },
    { msg: 'Ich habe die Outline angepasst und an Sie über die Plattform gesendet.', at: '2026-05-07T08:12:00', from: 'me' },
    { msg: 'Frage: Können wir noch eine empirische Erhebung ergänzen? Budget bitte über kundenservice@efactory1.de klären.', at: '2026-05-06T16:45:00', from: 'customer', flag: 'redirect' },
    { msg: 'Zwischenstand 1 ist hochgeladen — bitte um Feedback bis Donnerstag.', at: '2026-05-06T11:20:00', from: 'me' },
    { msg: 'Vielen Dank für die schnelle Rückmeldung — sehr gute Arbeit bisher!', at: '2026-05-05T17:08:00', from: 'customer' },
  ];

  const threads = D.myAssignments().slice(0, 5).map((o, i) => {
    const s = snippets[i % snippets.length];
    return {
      orderId: o.id,
      title: o.title,
      customer: D.customer(o.customerId)?.name || 'Customer',
      customerInitials: D.customer(o.customerId)?.initials || '··',
      lastMsg: s.msg,
      lastAt: s.at,
      lastFrom: s.from,
      flag: s.flag,
      unread: s.from === 'customer' && i < 2 ? 1 : 0,
    };
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Messages</h1>
          <div className="page-subtitle">Customer threads · per-order · efactory1 always in CC</div>
        </div>
      </div>

      <div className="banner warn mb-3">
        <Icon name="lock" size={14}/>
        <div style={{ flex: 1 }}>
          <strong>Auto-CC enforced.</strong> Every message you send is automatically CC&apos;d to <span className="mono">kundenservice@efactory1.de</span>.
          Financial questions ("price", "rate", "invoice") are intercepted and redirected to efactory1 — do not negotiate money with customers.
        </div>
      </div>

      <div className="card">
        <div className="card-head"><div className="card-title">Active threads</div><span className="text-faint fs-11">{threads.length} threads</span></div>
        <div className="flex-col" style={{ borderTop: '1px solid var(--border)' }}>
          {threads.map(t => (
            <div key={t.orderId} className="flex items-center gap-3" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => navigate('gw-assignment-detail', { id: t.orderId })}>
              <Avatar initials={t.customerInitials} size={32}/>
              <div className="flex-col" style={{ flex: 1, lineHeight: 1.3 }}>
                <div className="flex items-center gap-2">
                  <span className="strong fs-12">{t.customer}</span>
                  <span className="mono fs-11 text-faint">#{t.orderId}</span>
                  {t.unread > 0 && <span className="pill pill-red" style={{ fontSize: 10 }}>{t.unread} new</span>}
                  {t.flag === 'redirect' && <span className="pill pill-amber" style={{ fontSize: 10 }} title="Financial keyword detected — auto-redirected to kundenservice@efactory1.de"><Icon name="alert-triangle" size={9}/> redirected</span>}
                </div>
                <span className="text-faint fs-11" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 540 }}>
                  {t.lastFrom === 'me' && <span className="text-faint">You: </span>}
                  {t.lastMsg}
                </span>
              </div>
              <span className="text-faint fs-11 mono">{U.relTime(t.lastAt)}</span>
              <Icon name="chevron-right" size={14} className="text-faint"/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
window.GWMessages = GWMessages;

window.GWMessages = GWMessages;
})();
