'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionTokens } from './auth/session-unlock';
import './chat-widget.css';

type ChatAction = { flow?: string; step?: string; data?: Record<string, unknown> };
type CardButton = { label: string; action: ChatAction };
type Card = {
  kind: 'card';
  title?: string;
  body?: string;
  buttons?: CardButton[];
  rows?: { label: string; sub?: string; action: ChatAction }[];
};
type ChatMsg = {
  id: string;
  role: 'user' | 'ai' | 'admin' | 'system';
  content: string;
  actions?: Card | { kind?: string; buttons?: CardButton[] } | null;
  created_at: string;
};
type Pending = { flow: string; step: string; data: Record<string, unknown> } | null;

const VISITOR_KEY_STORE = 'verxor-chat-visitor';
const CONVO_KEY_STORE = 'verxor-chat-convo';

function getVisitorKey(): string {
  try {
    let k = localStorage.getItem(VISITOR_KEY_STORE);
    if (!k) {
      k = 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VISITOR_KEY_STORE, k);
    }
    return k;
  } catch {
    return 'v-anon';
  }
}

function looksLikePhone(t: string): boolean {
  const digits = t.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 14 && /^[+\d][\d\s+-]*$/.test(t.trim());
}

/**
 * Verxor live chat — the customer-side widget. Buttons run the deterministic
 * order flows (no LLM error possible in a checkout), typed text goes to the
 * backend which answers with Mistral when configured.
 */
export function ChatWidget({ session }: { session?: AuthSession | null }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [pending, setPending] = useState<Pending>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const convoRef = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const headers = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = loadSessionTokens()?.access_token;
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, []);

  const refresh = useCallback(async () => {
    const id = convoRef.current;
    if (!id) return;
    try {
      const res = await fetch(`/api/chat?conversationId=${encodeURIComponent(id)}`, {
        headers: headers(),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (data?.ok && Array.isArray(data.messages)) {
        setMessages(data.messages as ChatMsg[]);
      }
    } catch {
      /* next poll will retry */
    }
  }, [headers]);

  const openChat = useCallback(async () => {
    setOpen(true);
    try {
      convoRef.current = localStorage.getItem(CONVO_KEY_STORE);
    } catch {
      /* private mode */
    }
    if (!convoRef.current) {
      setBusy(true);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            type: 'action',
            action: { flow: 'welcome', step: 'start' },
            visitorKey: getVisitorKey(),
            firstName: session?.name?.split(' ')[0] || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (data?.ok && data.conversationId) {
          convoRef.current = String(data.conversationId);
          try {
            localStorage.setItem(CONVO_KEY_STORE, String(data.conversationId));
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      } finally {
        setBusy(false);
      }
    }
    setLoaded(true);
    void refresh();
  }, [headers, refresh, session?.name]);

  // Poll while open.
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => {
      void refresh();
    }, 4000);
    return () => clearInterval(t);
  }, [open, refresh]);

  // Autoscroll.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const send = useCallback(
    async (payload: { type: 'text' | 'action'; text?: string; action?: ChatAction }) => {
      setBusy(true);
      const isPhoneReply =
        payload.type === 'text' && pending?.step === 'phone' && looksLikePhone(payload.text || '');
      const body = {
        ...(payload.type === 'text' ? { type: 'text', text: payload.text } : { type: 'action', action: payload.action }),
        ...(isPhoneReply
          ? { type: 'action', action: { flow: pending?.flow, step: 'phone', data: { ...(pending?.data || {}), phone: payload.text } } }
          : {}),
        visitorKey: getVisitorKey(),
        firstName: session?.name?.split(' ')[0] || undefined,
      };
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (data?.ok) {
          if (data.conversationId && data.conversationId !== convoRef.current) {
            convoRef.current = String(data.conversationId);
            try {
              localStorage.setItem(CONVO_KEY_STORE, String(data.conversationId));
            } catch {
              /* ignore */
            }
          }
          setPending((data.pending as Pending) || null);
        }
      } catch {
        /* next poll will resync */
      } finally {
        setBusy(false);
        void refresh();
      }
    },
    [headers, pending, refresh, session?.name],
  );

  const onSendClick = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: 'tmp-' + Date.now(), role: 'user', content: text, created_at: new Date().toISOString() },
    ]);
    void send({ type: 'text', text });
  };

  const onButtonClick = (btn: CardButton) => {
    if (busy) return;
    setMessages((prev) => [
      ...prev,
      { id: 'tmp-' + Date.now(), role: 'user', content: btn.label, created_at: new Date().toISOString() },
    ]);
    void send({ type: 'action', action: btn.action });
  };

  const renderCard = (m: ChatMsg) => {
    const card = m.actions as Card | undefined;
    if (!card) return null;
    return (
      <div className="vxchat-card">
        {card.title ? <div className="vxchat-card-title">{card.title}</div> : null}
        {card.body ? <div className="vxchat-card-body">{card.body}</div> : null}
        {card.buttons?.length ? (
          <div className="vxchat-card-buttons">
            {card.buttons.map((b, i) => (
              <button key={i} type="button" className="vxchat-btn primary" onClick={() => onButtonClick(b)}>
                {b.label}
              </button>
            ))}
          </div>
        ) : null}
        {card.rows?.length ? (
          <div className="vxchat-card-rows">
            {card.rows.map((r, i) => (
              <button key={i} type="button" className="vxchat-row" onClick={() => onButtonClick({ label: r.label, action: r.action })}>
                {r.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {!open ? (
        <button type="button" className="vxchat-fab" onClick={() => void openChat()} aria-label="Open live chat">
          <MessageCircle size={22} />
        </button>
      ) : null}

      {open ? (
        <div className="vxchat-panel" role="dialog" aria-label="Verxor live chat">
          <div className="vxchat-head">
            <div className="vxchat-head-text">
              <strong>Verxor Assistant</strong>
              <span>Typically replies instantly · online 24/7</span>
            </div>
            <button type="button" className="vxchat-close" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={16} />
            </button>
          </div>

          <div className="vxchat-list" ref={listRef}>
            {messages.length === 0 && busy ? (
              <div className="vxchat-hint">Connecting…</div>
            ) : null}
            {messages
              .filter((m) => m.role !== 'system')
              .map((m) => (
                <div key={m.id} className={`vxchat-msg ${m.role === 'user' ? 'me' : 'them'}`}>
                  {m.content ? <div className="vxchat-bubble">{m.content}</div> : null}
                  {renderCard(m)}
                </div>
              ))}
          </div>

          <div className="vxchat-inputrow">
            <input
              className="vxchat-input"
              value={input}
              placeholder={pending?.step === 'phone' ? 'Type the phone number…' : 'Type a message…'}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSendClick();
              }}
              disabled={busy}
            />
            <button type="button" className="vxchat-send" onClick={onSendClick} disabled={busy || !input.trim()} aria-label="Send">
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
