'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { COUNTRIES, flagEmoji, type Country } from './countries';
import './auth.css';

export function CountryPickerSheet({
  open,
  selectedIso,
  onClose,
  onSelect,
}: {
  open: boolean;
  selectedIso: string;
  onClose: () => void;
  onSelect: (c: Country) => void;
}) {
  const [q, setQ] = useState('');

  useEffect(() => {
    if (open) setQ('');
  }, [open]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.dial.includes(s) ||
        c.iso.toLowerCase().includes(s) ||
        `+${c.dial}`.includes(s),
    );
  }, [q]);

  if (!open) return null;

  return (
    <div className="cc-sheet" role="dialog" aria-modal="true" aria-label="Select country">
      <div className="cc-sheet-head">
        <button type="button" className="cc-sheet-close" onClick={onClose} aria-label="Close">
          <X size={18} strokeWidth={2.2} />
        </button>
        <h2>Select country</h2>
        <span className="cc-sheet-spacer" />
      </div>
      <div className="cc-search-wrap">
        <Search size={16} strokeWidth={2.2} />
        <input
          type="search"
          placeholder="Search country or code"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>
      <ul className="cc-list">
        {list.map((c) => (
          <li key={c.iso + c.dial}>
            <button
              type="button"
              className={`cc-row ${c.iso === selectedIso ? 'active' : ''}`}
              onClick={() => {
                onSelect(c);
                onClose();
              }}
            >
              <span className="cc-flag">{flagEmoji(c.iso)}</span>
              <span className="cc-name">{c.name}</span>
              <span className="cc-dial">+{c.dial}</span>
            </button>
          </li>
        ))}
        {list.length === 0 ? (
          <li className="cc-empty">No countries match "{q}"</li>
        ) : null}
      </ul>
    </div>
  );
}

export function PhoneField({
  id = 'phone',
  label = 'Phone Number',
  country,
  national,
  onOpenPicker,
  onNationalChange,
  placeholder = '8012345678',
}: {
  id?: string;
  label?: string;
  country: Country;
  national: string;
  onOpenPicker: () => void;
  onNationalChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-phone-row">
        <button
          type="button"
          className="cc-trigger"
          onClick={onOpenPicker}
          aria-label={`Country ${country.name}, +${country.dial}`}
        >
          <span className="cc-trigger-flag">{flagEmoji(country.iso)}</span>
          <span className="cc-trigger-dial">+{country.dial}</span>
          <ChevronDown size={14} strokeWidth={2.4} />
        </button>
        <div className="auth-input-wrap auth-input-wrap--phone">
          <input
            id={id}
            type="tel"
            inputMode="tel"
            placeholder={placeholder}
            value={national}
            onChange={(e) => onNationalChange(e.target.value.replace(/[^\d]/g, ''))}
            autoComplete="tel-national"
          />
        </div>
      </div>
    </div>
  );
}
