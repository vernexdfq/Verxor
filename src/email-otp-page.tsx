'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import './email-otp-page.css';

// Popular platforms for autocomplete (AnyMessage accepts any site)
const POPULAR_PLATFORMS: { id: string; name: string; site: string; logoId?: string }[] = [
  { id: 'instagram', name: 'Instagram', site: 'instagram.com', logoId: 'instagram' },
  { id: 'google', name: 'Google / Gmail', site: 'google.com', logoId: 'google' },
  { id: 'tiktok', name: 'TikTok', site: 'tiktok.com', logoId: 'tiktok' },
  { id: 'facebook', name: 'Facebook', site: 'facebook.com', logoId: 'facebook' },
  { id: 'discord', name: 'Discord', site: 'discord.com', logoId: 'discord' },
  { id: 'x', name: 'X (Twitter)', site: 'x.com', logoId: 'twitter' },
  { id: 'telegram', name: 'Telegram', site: 'telegram.org', logoId: 'telegram' },
  { id: 'whatsapp', name: 'WhatsApp', site: 'whatsapp.com', logoId: 'whatsapp' },
  { id: 'reddit', name: 'Reddit', site: 'reddit.com', logoId: 'reddit' },
  { id: 'microsoft', name: 'Microsoft / Outlook', site: 'microsoft.com', logoId: 'microsoft' },
  { id: 'apple', name: 'Apple / iCloud', site: 'apple.com', logoId: 'apple' },
  { id: 'amazon', name: 'Amazon', site: 'amazon.com', logoId: 'amazon' },
  { id: 'netflix', name: 'Netflix', site: 'netflix.com', logoId: 'netflix' },
  { id: 'spotify', name: 'Spotify', site: 'spotify.com', logoId: 'spotify' },
  { id: 'linkedin', name: 'LinkedIn', site: 'linkedin.com', logoId: 'linkedin' },
  { id: 'snapchat', name: 'Snapchat', site: 'snapchat.com', logoId: 'snapchat' },
  { id: 'pinterest', name: 'Pinterest', site: 'pinterest.com', logoId: 'pinterest' },
  { id: 'twitch', name: 'Twitch', site: 'twitch.tv', logoId: 'twitch' },
  { id: 'steam', name: 'Steam', site: 'steamcommunity.com', logoId: 'steam' },
  { id: 'paypal', name: 'PayPal', site: 'paypal.com', logoId: 'paypal' },
];

type DomainRow = {
  domain: string;
  count: number;
  costUsd: number;
  priceNgn: number;
};

type Tab = 'buy' | 'my-emails';

function formatNgn(n: number) {
  return `₦${Math.round(n).toLocaleString('en-NG')}`;
}

function PlatformIcon({ logoId, name }: { logoId?: string; name: string }) {
  // Reuse virtual-numbers brand assets when available
  if (logoId) {
    return (
      <img
        src={`/brand/services/${logoId}.svg`}
        alt=""
        width={28}
        height={28}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
        style={{ borderRadius: 8 }}
      />
    );
  }
  return (
    <span className="eotp-fallback-icon" aria-hidden>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function EmailOtpPage({
  onBack,
  session,
  onFund,
}: {
  onBack: () => void;
  session?: AuthSession | null;
  onFund?: () => void;
}) {
  const [tab, setTab] = useState<Tab>('buy');
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState<(typeof POPULAR_PLATFORMS)[0] | null>(null);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return POPULAR_PLATFORMS.slice(0, 8);
    return POPULAR_PLATFORMS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.site.toLowerCase().includes(q) ||
        p.id.includes(q),
    ).slice(0, 10);
  }, [query]);

  const loadDomains = useCallback(async (site: string) => {
    setLoading(true);
    setError(null);
    setDomains([]);
    try {
      const res = await fetch(`/api/v1/email-otp/quantity?site=${encodeURIComponent(site)}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'Failed to load domains');
        return;
      }
      setDomains(Array.isArray(data.domains) ? data.domains : []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectPlatform = (p: (typeof POPULAR_PLATFORMS)[0]) => {
    setSelected(p);
    setQuery(p.name);
    setFocused(false);
    void loadDomains(p.site);
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery('');
    setDomains([]);
    setError(null);
    inputRef.current?.focus();
  };

  // Close suggestions on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('.eotp-search-wrap')) setFocused(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  return (
    <div className="eotp-page">
      <header className="eotp-header">
        <button type="button" className="eotp-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <div className="eotp-header-text">
          <p className="eotp-eyebrow">EMAIL OTP</p>
          <h1>Temporary Email</h1>
        </div>
      </header>

      <div className="eotp-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'buy'}
          className={tab === 'buy' ? 'active' : ''}
          onClick={() => setTab('buy')}
        >
          Buy Email
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'my-emails'}
          className={tab === 'my-emails' ? 'active' : ''}
          onClick={() => setTab('my-emails')}
        >
          My Emails
        </button>
      </div>

      {tab === 'buy' ? (
        <>
          <section className="eotp-search-section">
            <label className="eotp-label" htmlFor="eotp-search">
              Search platform
            </label>
            <div className={`eotp-search-wrap${focused ? ' focused' : ''}`}>
              <Search size={18} className="eotp-search-icon" />
              <input
                id="eotp-search"
                ref={inputRef}
                className="eotp-search-input"
                placeholder="e.g. Instagram, Google, TikTok…"
                value={query}
                autoComplete="off"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setFocused(true);
                  if (selected) setSelected(null);
                }}
                onFocus={() => setFocused(true)}
              />
              {query ? (
                <button
                  type="button"
                  className="eotp-clear"
                  aria-label="Clear"
                  onClick={clearSelection}
                >
                  <X size={16} />
                </button>
              ) : null}

              {focused && suggestions.length > 0 ? (
                <ul className="eotp-suggestions" role="listbox">
                  {suggestions.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="eotp-suggestion"
                        onClick={() => selectPlatform(p)}
                      >
                        <span className="eotp-suggestion-icon">
                          <PlatformIcon logoId={p.logoId} name={p.name} />
                        </span>
                        <span className="eotp-suggestion-text">
                          <strong>{p.name}</strong>
                          <small>{p.site}</small>
                        </span>
                        <ChevronRight size={16} className="eotp-chevron" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {!selected && !query ? (
              <div className="eotp-chips">
                {POPULAR_PLATFORMS.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="eotp-chip"
                    onClick={() => selectPlatform(p)}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          {selected ? (
            <section className="eotp-domains">
              <div className="eotp-domains-head">
                <div className="eotp-selected">
                  <PlatformIcon logoId={selected.logoId} name={selected.name} />
                  <div>
                    <strong>{selected.name}</strong>
                    <small>{selected.site}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="eotp-refresh"
                  disabled={loading}
                  onClick={() => loadDomains(selected.site)}
                  aria-label="Refresh"
                >
                  <RefreshCw size={16} className={loading ? 'spin' : ''} />
                </button>
              </div>

              {loading ? (
                <div className="eotp-state">
                  <Loader2 size={22} className="spin" />
                  <p>Loading available emails…</p>
                </div>
              ) : error ? (
                <div className="eotp-state error">
                  <p>{error}</p>
                  <button type="button" className="eotp-retry" onClick={() => loadDomains(selected.site)}>
                    Try again
                  </button>
                </div>
              ) : domains.length === 0 ? (
                <div className="eotp-state">
                  <Mail size={22} />
                  <p>No domains available for this platform right now.</p>
                </div>
              ) : (
                <ul className="eotp-domain-list">
                  {domains.map((d) => (
                    <li key={d.domain} className={d.count === 0 ? 'sold-out' : ''}>
                      <div className="eotp-domain-main">
                        <span className="eotp-domain-name">@{d.domain}</span>
                        <span className="eotp-domain-stock">
                          {d.count > 0
                            ? `${d.count.toLocaleString()} available`
                            : 'Out of stock'}
                        </span>
                      </div>
                      <div className="eotp-domain-action">
                        <strong className="eotp-price">{formatNgn(d.priceNgn)}</strong>
                        <button
                          type="button"
                          className="eotp-buy"
                          disabled={d.count === 0}
                          onClick={() => {
                            // Purchase flow comes next (wallet + order API)
                            window.alert(
                              `Buy @${d.domain} for ${formatNgn(d.priceNgn)} — purchase wiring next.`,
                            );
                          }}
                        >
                          Buy
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : (
            <div className="eotp-hint">
              <Mail size={20} />
              <p>Search or pick a platform to see available email domains and prices.</p>
            </div>
          )}
        </>
      ) : (
        <section className="eotp-my-emails">
          <div className="eotp-empty">
            <div className="eotp-empty-icon">
              <Inbox size={28} />
            </div>
            <strong>No emails yet</strong>
            <p>Purchase an email address to get started. Your activations will appear here.</p>
            <button type="button" className="eotp-primary" onClick={() => setTab('buy')}>
              Search platform
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
