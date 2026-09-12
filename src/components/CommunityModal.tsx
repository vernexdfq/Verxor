import { useEffect, useState } from 'react';
import { Megaphone, MessageCircle, Send, X } from 'lucide-react';

export const TELEGRAM_URL = 'https://t.me/VerxorOfficial';
export const WHATSAPP_URL = 'https://whatsapp.com/channel/0029VbE6zLAEQIag3m2Lvf1H';

const STORAGE_KEY = 'verxor-community-prompt-last-shown';
const SHOW_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

function markShown() {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Storage may be unavailable in restricted browser contexts.
  }
}

function shouldShow() {
  try {
    const lastShown = Number(window.localStorage.getItem(STORAGE_KEY) ?? 0);
    return !lastShown || Date.now() - lastShown >= SHOW_INTERVAL_MS;
  } catch {
    return true;
  }
}

export function CommunityModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!shouldShow()) return;
    const timer = window.setTimeout(() => {
      markShown();
      setOpen(true);
    }, 650);
    return () => window.clearTimeout(timer);
  }, []);

  const close = () => setOpen(false);

  const openChannel = (url: string) => {
    markShown();
    window.open(url, '_blank', 'noopener,noreferrer');
    close();
  };

  if (!open) return null;

  return (
    <div
      className="community-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="community-modal">
        <button type="button" className="community-close" onClick={close} aria-label="Close">
          <X size={19} />
        </button>
        <div className="community-icon" aria-hidden="true">
          <Megaphone size={23} strokeWidth={2.2} />
        </div>
        <p className="eyebrow">VERXOR COMMUNITY</p>
        <h2 id="community-modal-title">Stay in the Loop</h2>
        <p>Join Verxor on Telegram or WhatsApp for promotions, announcements, and exclusive offers.</p>
        <button type="button" className="community-btn telegram" onClick={() => openChannel(TELEGRAM_URL)}>
          <Send size={17} />
          Join Telegram
        </button>
        <button type="button" className="community-btn whatsapp" onClick={() => openChannel(WHATSAPP_URL)}>
          <MessageCircle size={18} />
          Join WhatsApp
        </button>
        <button type="button" className="community-later" onClick={close}>Maybe later</button>
      </div>
    </div>
  );
}
