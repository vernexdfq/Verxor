'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  AtSign,
  Check,
  Lock,
  Mail,
  Phone,
  Trash2,
  User,
} from 'lucide-react';
import type { AuthSession } from './auth/AuthFlow';
import './edit-profile-page.css';

function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('234') && digits.length >= 13) {
    digits = '0' + digits.slice(3);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits;
  }
  return raw || '—';
}

function deriveUsername(name: string, contact: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 12);
  const tail = contact.replace(/\D/g, '').slice(-3);
  return base ? `${base}${tail}` : `user${tail || '001'}`;
}

export function EditProfilePage({
  onBack,
  session,
  onSaved,
}: {
  onBack: () => void;
  session: AuthSession;
  onSaved?: (patch: { name: string; username: string }) => void;
}) {
  const phone = useMemo(() => {
    if (session.method === 'phone') return formatPhone(session.contact);
    return formatPhone(session.contact) || '08141620644';
  }, [session]);

  const email = useMemo(() => {
    if (session.method === 'email') return session.contact;
    try {
      const raw = localStorage.getItem('verxor-auth-session');
      if (raw) {
        const p = JSON.parse(raw) as { email?: string };
        if (p.email) return p.email;
      }
    } catch {
      /* ignore */
    }
    return 'vernexdfq@gmail.com';
  }, [session]);

  const [fullName, setFullName] = useState(session.name || '');
  const [username, setUsername] = useState(() =>
    deriveUsername(session.name || 'user', session.contact),
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const initialName = session.name || '';
  const initialUser = useMemo(
    () => deriveUsername(session.name || 'user', session.contact),
    [session],
  );

  const dirty =
    fullName.trim() !== initialName.trim() ||
    username.trim().toLowerCase() !== initialUser.trim().toLowerCase();

  const nameOk = fullName.trim().length >= 2;
  const userOk = /^[a-zA-Z0-9._]{3,20}$/.test(username.trim());
  const canSave = dirty && nameOk && userOk && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    try {
      const raw = localStorage.getItem('verxor-auth-session');
      const prev = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      localStorage.setItem(
        'verxor-auth-session',
        JSON.stringify({
          ...prev,
          name: fullName.trim(),
          username: username.trim().toLowerCase(),
          authenticated: false,
        }),
      );
    } catch {
      /* ignore */
    }
    onSaved?.({ name: fullName.trim(), username: username.trim().toLowerCase() });
    setSaving(false);
    setToast('Profile updated');
    window.setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="ep-page">
      <header className="ep-top">
        <button type="button" className="ep-back" onClick={onBack} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.2} />
        </button>
        <div className="ep-top-mid">
          <h1>Edit Profile</h1>
          <p>Update your personal information</p>
        </div>
        <span className="ep-top-spacer" />
      </header>

      <div className="ep-scroll">
        <div className="ep-field">
          <label htmlFor="ep-name">Full name</label>
          <div className="ep-input">
            <User size={16} className="ep-ico" aria-hidden />
            <input
              id="ep-name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          {!nameOk && fullName.length > 0 && (
            <span className="ep-hint err">Enter at least 2 characters</span>
          )}
        </div>

        <div className="ep-field">
          <label htmlFor="ep-user">Username</label>
          <div className="ep-input">
            <AtSign size={16} className="ep-ico" aria-hidden />
            <input
              id="ep-user"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.replace(/[^a-zA-Z0-9._]/g, '').slice(0, 20))
              }
              placeholder="username"
            />
          </div>
          {!userOk && username.length > 0 && (
            <span className="ep-hint err">3–20 letters, numbers, . or _</span>
          )}
        </div>

        <div className="ep-field">
          <label htmlFor="ep-phone">
            Phone number <span className="ep-locked-tag">Cannot be changed</span>
          </label>
          <div className="ep-input locked">
            <Phone size={16} className="ep-ico" aria-hidden />
            <input id="ep-phone" type="text" value={phone} readOnly disabled />
            <Lock size={14} className="ep-lock" aria-hidden />
          </div>
        </div>

        <div className="ep-field">
          <label htmlFor="ep-email">
            Email address <span className="ep-locked-tag">Cannot be changed</span>
          </label>
          <div className="ep-input locked">
            <Mail size={16} className="ep-ico" aria-hidden />
            <input id="ep-email" type="email" value={email} readOnly disabled />
            <Lock size={14} className="ep-lock" aria-hidden />
          </div>
        </div>

        <button type="button" className="ep-save" disabled={!canSave} onClick={save}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        <div className="ep-danger">
          <button
            type="button"
            className="ep-delete"
            onClick={() => {
              setDeleteOpen(true);
              setDeleteConfirm('');
            }}
          >
            <Trash2 size={16} strokeWidth={2.2} />
            Delete Account
          </button>
          <p>This action is permanent and cannot be undone.</p>
        </div>
      </div>

      {deleteOpen && (
        <div className="ep-modal-root" role="dialog" aria-modal="true">
          <button
            type="button"
            className="ep-modal-backdrop"
            aria-label="Close"
            onClick={() => setDeleteOpen(false)}
          />
          <div className="ep-modal">
            <h2>Delete account?</h2>
            <p>
              Type <strong>DELETE</strong> to confirm. Your wallet balance and history will be
              removed permanently.
            </p>
            <input
              className="ep-modal-input"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE"
              autoFocus
            />
            <div className="ep-modal-actions">
              <button type="button" className="ep-modal-cancel" onClick={() => setDeleteOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="ep-modal-danger"
                disabled={deleteConfirm !== 'DELETE'}
                onClick={() => {
                  setDeleteOpen(false);
                  setToast('Account deletion requires support — contact us');
                  window.setTimeout(() => setToast(null), 2800);
                }}
              >
                Delete forever
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="ep-toast" role="status">
          <Check size={14} strokeWidth={2.5} /> {toast}
        </div>
      )}
    </div>
  );
}
