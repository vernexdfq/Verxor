'use client';

import { Info, X } from 'lucide-react';

export function AboutSmsBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="vn-about-banner">
      <Info size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
      <div className="vn-about-text">
        <strong>About SMS delivery</strong>
        <p>Some services may require several attempts</p>
      </div>
      <button type="button" className="vn-about-link" onClick={onOpen}>
        See details ›
      </button>
    </div>
  );
}

export function AboutSmsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="vn-sheet-backdrop" onClick={onClose}>
      <div className="vn-sheet vn-about-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="vn-sheet-head">
          <strong>If SMS is not received</strong>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="vn-about-body">
          <p>
            We cannot guarantee 100% delivery to temporary numbers. For some services,
            several attempts for one successful SMS can be normal.
          </p>
          <div className="vn-about-points">
            <div className="vn-about-point">
              <span className="vn-about-point-icon">↻</span>
              <span>No SMS → money is refunded</span>
            </div>
            <div className="vn-about-point">
              <span className="vn-about-point-icon">✕</span>
              <span>You can also tap Cancel after the lock timer</span>
            </div>
          </div>
          <p className="vn-about-tips-title">Tips to improve delivery:</p>
          <ul className="vn-about-tips">
            <li>Try a different number</li>
            <li>Choose another country or route</li>
            <li>Change your IP (VPN)</li>
            <li>Log out of other active accounts</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
