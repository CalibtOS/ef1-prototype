// /wp/vielen-dank thank-you page. Identical response for new and existing
// email submissions (D-21: no on-screen enumeration leak). The visitor must
// open the Demo Inbox and click the magic-link to log in — there is no
// silent auto-login on submit.
import React from 'react';
import { Icon } from '../../utils.jsx';

function WpVielenDank({ navigate, params, switchRole }) {
  const orderId = params?.orderId || null;

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fb' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #e4e7ec' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ fontWeight: 700, letterSpacing: 0, fontSize: 22 }}>
            e<span style={{ color: '#1F62F0' }}>factory</span>
            <span style={{ fontSize: 14, color: '#5b6473' }}>1</span>
          </div>
          <span style={{ flex: 1 }}/>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Simulated marketing site</span>
        </div>
      </div>
      <div style={{ maxWidth: 640, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(16,185,129,0.12)', color: '#10b981', margin: '0 auto 18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={28}/>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 10px' }}>Vielen Dank für Ihre Anfrage</h1>
        <p style={{ color: '#5b6473', fontSize: 14, lineHeight: 1.55, margin: '0 0 24px' }}>
          Wir haben Ihre Anfrage erhalten und Ihnen einen Anmeldelink an Ihre E-Mail-Adresse
          zugeschickt. Bitte öffnen Sie den Link, um sich in Ihrem Dashboard anzumelden.
        </p>

        <div style={{ background: '#fff', border: '1px solid #e4e7ec', borderRadius: 10, padding: '14px 18px', color: '#34404f', fontSize: 13, marginTop: 16, textAlign: 'left' }}>
          <strong style={{ display: 'block', marginBottom: 4 }}>Bitte E-Mail prüfen</strong>
          Den Anmeldelink finden Sie in Ihrem Postfach.
          <span style={{ display: 'block', color: '#94a3b8', fontSize: 11.5, marginTop: 8 }}>
            [Simulation] Öffnen Sie die <strong>Demo Inbox</strong> in der oberen Demo-Leiste, um den Magic-Link anzuklicken.
          </span>
        </div>
      </div>
    </div>
  );
}

export { WpVielenDank };
