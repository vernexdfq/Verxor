'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Lightbulb, MessageSquare, Send } from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import './feedback-page.css';

const STORAGE_KEY = 'verxor-feedback-items';

type FeedbackType =
  | 'feature'
  | 'bug'
  | 'poor'
  | 'like'
  | 'general';

type FeedbackItem = {
  id: string;
  type: FeedbackType;
  subject: string;
  message: string;
  createdAt: string;
  status: 'received';
};

const TYPE_OPTIONS: { id: FeedbackType; label: string; short: string }[] = [
  {
    id: 'feature',
    label: 'Feature Suggestion — An idea for something new or an improvement',
    short: 'Feature Suggestion',
  },
  {
    id: 'bug',
    label: "Bug / Issue Report — Something isn't working as it should",
    short: 'Bug / Issue Report',
  },
  {
    id: 'poor',
    label: 'Poor Experience — A service or support experience that fell short',
    short: 'Poor Experience',
  },
  {
    id: 'like',
    label: "What You Like — Tell us what's working well for you",
    short: 'What You Like',
  },
  {
    id: 'general',
    label: 'General Suggestion — Any other thoughts on how we can do better',
    short: 'General Suggestion',
  },
];

function loadItems(): FeedbackItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FeedbackItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveItems(items: FeedbackItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function formatStamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** Title-case first name so "DESTINY" → "Destiny" */
function displayFirstName(full: string): string {
  const raw = (full || 'User').trim().split(/\s+/)[0] || 'User';
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function resolveReplyEmail(session: AuthSession): string {
  if (session.method === 'email' && session.contact.includes('@')) {
    return session.contact.trim();
  }
  try {
    const raw = localStorage.getItem('verxor-auth-session');
    if (raw) {
      const parsed = JSON.parse(raw) as { email?: string; contact?: string; method?: string };
      if (parsed.email && parsed.email.includes('@')) return parsed.email;
      if (parsed.method === 'email' && parsed.contact?.includes('@')) return parsed.contact;
    }
  } catch {
    /* ignore */
  }
  return '';
}

export function FeedbackPage({
  onBack,
  session,
}: {
  onBack: () => void;
  session: AuthSession;
}) {
  const name = displayFirstName(session.name || 'User');
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [type, setType] = useState<FeedbackType | ''>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setItems(loadItems());
  }, []);

  const typeLabel = useMemo(() => {
    if (!type) return 'Choose one…';
    const opt = TYPE_OPTIONS.find((o) => o.id === type);
    return opt ? opt.label : 'Choose one…';
  }, [type]);

  const canSend =
    Boolean(type) && subject.trim().length >= 3 && message.trim().length >= 8 && !sending;

  const handleSend = useCallback(async () => {
    if (!canSend || !type) return;
    setSending(true);
    setError('');

    const payload = {
      type,
      subject: subject.trim(),
      message: message.trim(),
      userName: session.name || name,
      userContact: session.contact || '',
      userEmail: resolveReplyEmail(session),
    };

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Could not send feedback');
      }

      const item: FeedbackItem = {
        id: data.id || `fb_${Date.now()}`,
        type,
        subject: payload.subject,
        message: payload.message,
        createdAt: new Date().toISOString(),
        status: 'received',
      };
      const next = [item, ...loadItems()].slice(0, 50);
      saveItems(next);
      setItems(next);
      setType('');
      setSubject('');
      setMessage('');
      setPickerOpen(false);
      setJustSent(true);
      window.setTimeout(() => setJustSent(false), 2400);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSending(false);
    }
  }, [canSend, type, subject, message, session, name]);

  return (
    <div className="fb-page">
      <header className="fb-header">
        <button type="button" className="fb-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.25} />
          <span>Back</span>
        </button>
        <h1 className="fb-title">Feedback</h1>
        <span className="fb-header-spacer" aria-hidden />
      </header>

      <div className="fb-scroll">
        <section className="fb-hero">
          <h2>
            We're listening, {name}{' '}
            <span aria-hidden>👋</span>
          </h2>
          <p>
            Your feedback genuinely shapes where we take Verxor next. Suggest a feature, flag a
            bug, tell us where we fell short, or just say what you like — every message reaches
            our team.
          </p>
        </section>

        <p className="fb-section-label">Share something</p>

        <section className="fb-form-card">
          <label className="fb-field-label">Feedback type</label>
          <button
            type="button"
            className={`fb-select ${type ? 'has-value' : ''}`}
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
          >
            <span className={type ? '' : 'placeholder'}>{typeLabel}</span>
            <ChevronDown size={18} strokeWidth={2} />
          </button>

          {pickerOpen ? (
            <div className="fb-picker" role="listbox">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="option"
                  aria-selected={type === opt.id}
                  className={`fb-picker-item ${type === opt.id ? 'active' : ''}`}
                  onClick={() => {
                    setType(opt.id);
                    setPickerOpen(false);
                  }}
                >
                  <span className="fb-radio" aria-hidden />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          ) : null}

          <label className="fb-field-label" htmlFor="fb-subject">
            Subject
          </label>
          <input
            id="fb-subject"
            className="fb-input"
            type="text"
            placeholder="Sum it up in a few words"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={120}
            autoComplete="off"
          />

          <label className="fb-field-label" htmlFor="fb-message">
            Your message
          </label>
          <textarea
            id="fb-message"
            className="fb-textarea"
            placeholder="Tell us as much detail as you'd like…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={2000}
          />

          {error ? <p className="fb-error">{error}</p> : null}

          <button
            type="button"
            className={`fb-send ${justSent ? 'success' : ''}`}
            disabled={!canSend}
            onClick={() => void handleSend()}
          >
            {justSent ? (
              <>
                <Check size={18} strokeWidth={2.5} />
                Sent
              </>
            ) : sending ? (
              'Sending…'
            ) : (
              <>
                <Send size={17} strokeWidth={2.25} />
                Send Feedback
              </>
            )}
          </button>
        </section>

        {items.length > 0 ? (
          <>
            <p className="fb-section-label">Your feedback</p>
            <ul className="fb-history">
              {items.map((item) => {
                const meta = TYPE_OPTIONS.find((o) => o.id === item.type);
                return (
                  <li key={item.id} className="fb-history-card">
                    <div className="fb-history-top">
                      <span className="fb-badge">
                        <Lightbulb size={12} strokeWidth={2.5} />
                        {meta?.short || 'Feedback'}
                      </span>
                      <span className="fb-status">Received</span>
                    </div>
                    <h3>{item.subject}</h3>
                    <p>{item.message}</p>
                    <time dateTime={item.createdAt}>{formatStamp(item.createdAt)}</time>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="fb-empty">
            <MessageSquare size={22} strokeWidth={1.75} />
            <p>No feedback sent yet. Your messages will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
