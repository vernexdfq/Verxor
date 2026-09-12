import { useEffect, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';

const TELEGRAM = 'https://t.me/VerxorOfficial';
const WHATSAPP = 'https://wa.me/2348141620644';

export function CommunityModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('verxor_community_seen')) return;
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  const close = () => {
    localStorage.setItem('verxor_community_seen', '1');
    setOpen(false);
  };

  if (!open) return null;

  return <div className="community-overlay" role="dialog" aria-modal="true" aria-labelledby="community-title">
    <div className="community-modal">
      <button className="community-close" onClick={close} aria-label="Close"><X size={18} /></button>
      <div className="community-icon" aria-hidden="true">V</div>
      <p className="eyebrow">VERXOR COMMUNITY</p>
      <h2 id="community-title">Stay updated</h2>
      <p>Join our channels for new countries, promotions and faster support.</p>
      <a href={TELEGRAM} target="_blank" rel="noopener noreferrer" className="community-btn telegram"><Send size={16} /> Join Telegram</a>
      <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="community-btn whatsapp"><MessageCircle size={16} /> Join WhatsApp</a>
      <button className="community-later" onClick={close}>Maybe later</button>
    </div>
  </div>;
}
