'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionTokens } from './auth/session-unlock';
import './chat-widget.css';

type ChatButton = { label: string; payload: string };

type ChatMessage = {
  id: string;
  role: 'user' | 'ai' | 'admin' | 'system';
  content: string;
  buttons?: ChatButton[];
  at?: string;
};

const CONVO_KEY = 'verxor-chat-conversation-id';

/**
 * Verxor assistant — floating chat widget. Buttons in AI cards carry payloads
 * that drive the server-side flow engine; open_* payloads navigate the app.
 */
export function ChatWidget({
  session,
  onOpenFund,
  onOpenService,
}: {
  session: AuthSession | null;
  onOpenFund: () => void;
  onOpenService: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  const headers = useCallback((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = loadSessionTokens()?.access_token;
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }, []);

  const navigate = useCallback((payload: string) => {
    switch (payload) {
      case 'open_fund':
        onOpenFund();
        return true;
      case 'open_airtime':
        onOpenService('airtime');
        return true;
      case 'open_vn':
        onOpenService('virtual-numbers');
        return true;
      case 'open_email':
        onOpenService('email-otp');
        return true;
      case 'open_logs':
        onOpenService('accounts');
        return true;
      case 'open_boost':
        onOpenService('boost');
        return true;
      default:
        return false;
    }
  }, [onOpenFund, onOpenService]);

  const scrollDown = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  // Restore the last conversation once, when the widget first opens.
  useEffect(() => {
    if (!open || loaded || !sessionRef.current) return;
    setLoaded(true);
    void (async () => {
      try {
        const res = await fetch('/api/chat', { headers: headers(), cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (data?.ok && data.conversationId) {
          setConversationId(data.conversationId);
          try {
            localStorage.setItem(CONVO_KEY, data.conversationId);
          } catch { /* ignore */ }
          const restored: ChatMessage[] = (data.messages || []).map(
            (m: { id: string; role: string; content: string; actions?: { buttons?: ChatButton[] } }) => ({
              id: m.id,
              role: m.role as ChatMessage['role'],
              content: m.content,
              buttons: m.actions?.buttons || undefined,
            }),
          );
          if (restored.length > 0) setMessages(restored);
        }
      } catch { /* offline */ }
    })();
  }, [open, loaded, headers]);

  const send = useCallback(
    async (opts: { text?: string; payload?: string; label?: string }) => {
      if (busy) return;
      const text = opts.text?.trim();
      const payload = opts.payload?.trim();
      if (!text && !payload) return;
      setBusy(true);
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, role: 'user', content: text || opts.label || payload || '' },
      ]);
      setInput('');
      scrollDown();
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            conversationId: conversationId || undefined,
            text: text || undefined,
            payload: payload || undefined,
            label: opts.label || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: 'system',
              content: data?.error || 'Chat is unavailable right now. Please try again.',
            },
          ]);
          return;
        }
        if (data.conversationId) {
          setConversationId(data.conversationId);
          try {
            localStorage.setItem(CONVO_KEY, data.conversationId);
          } catch { /* ignore */ }
        }
        const incoming: ChatMessage[] = (data.messages || []).map(
          (m: { id: string; role: string; content: string; actions?: { buttons?: ChatButton[] } }) => ({
            id: m.id,
            role: m.role as ChatMessage['role'],
            content: m.content,
            buttons: m.actions?.buttons || undefined,
          }),
        );
        if (incoming.length > 0) setMessages((prev) => [...prev, ...incoming]);
        if (payload) navigate(payload);
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: 'system', content: 'Network error. Please try again.' },
        ]);
      } finally {
        setBusy(false);
        scrollDown();
      }
    },
    [busy, conversationId, headers, navigate, scrollDown],
  );

  const startChat = useCallback(() => {
    setOpen(true);
    // First open: greet + menu.
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: 'welcome',
          role: 'ai',
          content: `Hello${sessionRef.current?.name ? ` ${sessionRef.current.name}` : ''} 👋 I am your Verxor assistant. Buy data right here in chat, or jump to any service.`,
          buttons: [
            { label: '📱 Buy Data', payload: 'start_data' },
            { label: '⚡ Buy Airtime', payload: 'open_airtime' },
            { label: '🔢 Virtual Number', payload: 'open_vn' },
            { label: '📧 Email OTP', payload: 'open_email' },
            { label: '👥 Buy Logs', payload: 'open_logs' },
            { label: '🚀 Boost', payload: 'open_boost' },
          ],
        },
      ];
    });
    scrollDown();
  }, [scrollDown]);

  if (!session) return null;

  return (
    <>
      {!open ? (
        <button
          type="button"
          className="vxc-fab"
          onClick={startChat}
          aria-label="Open Verxor assistant"
        >
          <MessageCircle size={24} />
        </button>
      ) : (
        <div className="vxc-panel" role="dialog" aria-label="Verxor assistant">
          <header className="vxc-head">
            <div className="vxc-head-id">
              <span className="vxc-avatar">V</span>
              <div>
                <strong>Verxor Assistant</strong>
                <span className="vxc-status">
                  <i /> Online 24/7
                </span>
              </div>
            </div>
            <button type="button" className="vxc-close" onClick={() => setOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </header>

          <div className="vxc-list" ref={listRef}>
            {messages.map((m) => (
              <div key={m.id} className={`vxc-msg vxc-${m.role}`}>
                <div className="vxc-bubble">{m.content}</div>
                {m.buttons && m.buttons.length > 0 ? (
                  <div className="vxc-buttons">
                    {m.buttons.map((b, i) => (
                      <button
                        key={`${m.id}-b${i}`}
                        type="button"
                        className="vxc-btn"
                        disabled={busy}
                        onClick={() => void send({ payload: b.payload, label: b.label })}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {busy ? <div className="vxc-typing">Assistant is typing…</div> : null}
          </div>

          <form
            className="vxc-input-row"
            onSubmit={(e) => {
              e.preventDefault();
              void send({ text: input });
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              aria-label="Chat message"
              disabled={busy}
            />
            <button type="submit" disabled={busy || !input.trim()} aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
