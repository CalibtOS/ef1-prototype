// GW · Messages — anonymized customer threads (admin always CC).
;(function(){
const { useState: useStateA } = React;
const { Icon, Avatar, NotReady, EmptyState, ChatNotice, ChatMessage, ChatComposer, ChatThreadRow } = window;
const U = window.EFU;
const D = window.EF;

// ============ GW MESSAGES ============
function GWMessages({ navigate }) {
  const [activeId, setActiveId] = useStateA(null);
  const [reply, setReply] = useStateA('');
  const myAssignments = window.EFHooks.useOrders({ gwId: D.GW_ME.id });

  const snippets = [
    { msg: 'Passt so — bitte mit Kapitel 3 weitermachen. Ich melde mich wieder zum Zwischenstand.', at: '2026-05-07T10:34:00', from: 'customer' },
    { msg: 'Ich habe die Outline angepasst und an Sie über die Plattform gesendet.', at: '2026-05-07T08:12:00', from: 'me' },
    { msg: 'Frage: Können wir noch eine empirische Erhebung ergänzen? Budget bitte über kundenservice@efactory1.de klären.', at: '2026-05-06T16:45:00', from: 'customer', flag: 'redirect' },
    { msg: 'Zwischenstand 1 ist hochgeladen — bitte um Feedback bis Donnerstag.', at: '2026-05-06T11:20:00', from: 'me' },
    { msg: 'Vielen Dank für die schnelle Rückmeldung — sehr gute Arbeit bisher!', at: '2026-05-05T17:08:00', from: 'customer' },
  ];

  const threads = myAssignments.slice(0, 5).map((o, i) => {
    const s = snippets[i % snippets.length];
    const customer = D.customer(o.customerId);
    return {
      orderId: o.id,
      title: o.title,
      customer: customer?.name || 'Customer',
      customerInitials: customer?.initials || '··',
      lastMsg: s.msg,
      lastAt: s.at,
      lastFrom: s.from,
      flag: s.flag,
      unread: s.from === 'customer' && i < 2 ? 1 : 0,
    };
  });

  const active = threads.find(t => t.orderId === activeId) || threads[0];
  const transcript = active ? [
    { from: 'customer', at: '2026-05-05T17:08:00', text: 'Vielen Dank für die schnelle Rückmeldung — sehr gute Arbeit bisher!' },
    { from: 'me', at: '2026-05-06T11:20:00', text: 'Zwischenstand 1 ist hochgeladen. Bitte schauen Sie über den Dokumente-Bereich rein und geben Sie mir kurz Feedback.', attachments: [{ name: 'Zwischenstand_1.pdf', meta: '1.1 MB', icon: 'file-text' }] },
    { from: 'customer', at: '2026-05-06T16:45:00', text: 'Können wir noch eine empirische Erhebung ergänzen? Budget bitte über kundenservice@efactory1.de klären.', flag: 'redirect' },
    { from: 'system', at: '2026-05-06T16:45:10', text: 'Finanzbezug erkannt · an kundenservice weitergeleitet · bitte nicht direkt verhandeln.' },
    { from: 'me', at: '2026-05-07T08:12:00', text: 'Ich kann den methodischen Umfang fachlich einschätzen. Alles Vertragliche klärt efactory1 direkt mit Ihnen.' },
    { from: 'customer', at: '2026-05-07T10:34:00', text: active.lastMsg },
  ] : [];

  const onSend = () => {
    if (!reply.trim()) return;
    window.efToast && window.efToast({ text: `Message sent to ${active.customer} · CC kundenservice@efactory1.de`, tone: 'success' });
    setReply('');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Messages</h1>
          <div className="page-subtitle">Customer chats · one thread per assignment · efactory1 always in CC</div>
        </div>
      </div>

      <ChatNotice compact tone="warn">
        Auto-CC is enforced. Financial questions are redirected to <span className="mono">kundenservice@efactory1.de</span>; do not negotiate pricing or invoices in chat.
      </ChatNotice>

      <div className="chat-app-grid mt-3">
        <div className="chat-shell" style={{ minHeight: 620 }}>
          <div className="chat-header">
            <div className="chat-title">
              <div>
                <span className="chat-title-main">Active threads</span>
                <span className="chat-title-sub">{threads.length} assignments</span>
              </div>
            </div>
          </div>
          <div className="chat-thread-list">
            {threads.map(t => (
              <ChatThreadRow
                key={t.orderId}
                active={active?.orderId === t.orderId}
                unread={t.unread}
                initials={t.customerInitials}
                title={t.customer}
                subtitle={`#${t.orderId} · ${t.title}`}
                preview={<>{t.lastFrom === 'me' && 'You: '}{t.lastMsg}</>}
                meta={U.relTime(t.lastAt)}
                onClick={() => setActiveId(t.orderId)}
                badges={t.flag === 'redirect' && <span className="pill pill-amber" style={{ fontSize: 10 }}><Icon name="alert-triangle" size={9}/> redirected</span>}
              />
            ))}
            {threads.length === 0 && <EmptyState compact icon="message-square" title="No active chats" body="Customer chat unlocks after assignment approval."/>}
          </div>
        </div>

        {active && (
          <div className="chat-shell chat-shell-soft">
            <div className="chat-header">
              <div className="chat-title">
                <Avatar initials={active.customerInitials} size={34} tone="blue"/>
                <div style={{ minWidth: 0 }}>
                  <span className="chat-title-main">{active.customer}</span>
                  <span className="chat-title-sub">Order #{active.orderId} · {active.title}</span>
                </div>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => navigate('gw-assignment-detail', { id: active.orderId })}>
                <Icon name="external-link" size={12}/> Auftrag
              </button>
            </div>

            <ChatNotice compact>
              Files stay on-platform. Customer-visible attachments are sent through the document area and mirrored in chat.
            </ChatNotice>

            <div className="chat-stream">
              {transcript.map((m, i) => {
                const mine = m.from === 'me';
                const sys = m.from === 'system';
                const prev = transcript[i - 1];
                const grouped = !!prev && prev.from === m.from && !sys && prev.from !== 'system';
                return (
                  <ChatMessage
                    key={i}
                    mine={mine}
                    system={sys}
                    sender={active.customer}
                    initials={active.customerInitials}
                    at={m.at}
                    attachments={m.attachments}
                    grouped={grouped}
                    status={mine ? 'CC aktiv' : null}
                  >
                    {m.text}
                  </ChatMessage>
                );
              })}
            </div>

            <ChatComposer
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onSend={onSend}
              placeholder={`Reply to ${active.customer}...`}
              sendLabel="Send"
              actions={<NotReady className="chat-icon-action" ariaLabel="Attach file" feature="attach-file"><Icon name="paperclip" size={15}/></NotReady>}
            />
          </div>
        )}
      </div>
    </div>
  );
}

window.GWMessages = GWMessages;
})();
