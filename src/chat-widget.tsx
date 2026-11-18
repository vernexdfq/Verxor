'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, MessageCircle, Minimize2, Send, X } from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import { loadSessionProfile, loadSessionTokens } from './auth/session-unlock';
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
  const [full, setFull] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  /**
   * Fresh auth headers. Supabase access tokens expire after ~1h; the stored
   * copy can be stale. getUser() validates with the server and triggers the
   * client's automatic token refresh, then getSession() returns the fresh
   * token. As a soft-session fallback (same pattern as the wallet endpoint)
   * we always attach the profile userId via x-vx-user.
   */
  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const userId = loadSessionProfile()?.userId;
    if (userId) h['x-vx-user'] = userId;
    try {
      const { getSupabaseBrowser } = await import('../lib/supabase/client');
      const sb = getSupabaseBrowser();
      if (sb) {
        // Server-side check — refreshes an expired token when needed.
        await sb.auth.getUser().catch(() => undefined);
      }
      const res = (await sb?.auth.getSession()) as
        | { data?: { session?: { access_token?: string } | null } }
        | null
        | undefined;
      const token = res?.data?.session?.access_token || loadSessionTokens()?.access_token;
      if (token) h.Authorization = `Bearer ${token}`;
    } catch {
      const token = loadSessionTokens()?.access_token;
      if (token) h.Authorization = `Bearer ${token}`;
    }
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
      case 'open_giftcard':
        onOpenService('gift-card');
        return true;
      case 'open_support':
        onOpenService('support-center');
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
        const res = await fetch('/api/chat', { headers: await authHeaders(), cache: 'no-store' });
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
  }, [open, loaded, authHeaders]);

  // Poll for new messages while open — admin replies from the dashboard
  // (or Telegram) land in the open widget without the customer refreshing.
  useEffect(() => {
    if (!open || !conversationId) return;
    const timer = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/chat?conversationId=${encodeURIComponent(conversationId)}`, {
          headers: await authHeaders(),
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok || !data.conversationId) return;
        setMessages((prev) => {
          const known = new Set(prev.map((m) => m.id));
          const fresh = ((data.messages || []) as {
            id: string;
            role: string;
            content: string;
            actions?: { buttons?: ChatButton[] };
          }[])
            // Customer's own messages come from this widget already; only
            // incoming (ai / admin / system) messages are merged in.
            .filter((m) => m.role !== 'user' && !known.has(m.id))
            .map((m) => ({
              id: m.id,
              role: m.role as ChatMessage['role'],
              content: m.content,
              buttons: m.actions?.buttons || undefined,
            }));
          if (fresh.length === 0) return prev;
          requestAnimationFrame(() => scrollDown());
          return [...prev, ...fresh];
        });
      } catch {
        /* offline */
      }
    }, 10000);
    return () => window.clearInterval(timer);
  }, [open, conversationId, authHeaders, scrollDown]);

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
          headers: await authHeaders(),
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
    [busy, conversationId, authHeaders, navigate, scrollDown],
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
          content: `Hello${sessionRef.current?.name ? ` ${sessionRef.current.name}` : ''} 👋 I am your Verxor assistant. What would you like to do today?`,
          buttons: [
            { label: '💬 Get Support', payload: 'get_support' },
            { label: '🎫 Open Ticket', payload: 'open_ticket' },
            { label: '🛒 Buy Service', payload: 'buy_service' },
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
        <div className={`vxc-panel${full ? ' vxc-full' : ''}`} role="dialog" aria-label="Verxor assistant">
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
            <div className="vxc-head-actions">
              <button
                type="button"
                className="vxc-close"
                onClick={() => setFull((v) => !v)}
                aria-label={full ? 'Exit full page' : 'Open full page'}
              >
                {full ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
              <button type="button" className="vxc-close" onClick={() => setOpen(false)} aria-label="Close chat">
                <X size={18} />
              </button>
            </div>
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
