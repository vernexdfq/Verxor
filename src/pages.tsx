import { ArrowDownLeft, ArrowUpRight, Copy, CreditCard, Globe2, History as HistoryIcon, Plus, Settings, ShieldCheck, Smartphone, UserRound, WalletCards } from 'lucide-react';
import { Card, PrimaryButton, SectionHeader } from './components/ui';
import type { Page } from './types';

export function HomePage({ go }: { go: (page: Page) => void }) {
  return <>
    <section className="hero"><div><p className="eyebrow">WELCOME BACK</p><h1>Everything you need,<br />in one place.</h1><p className="hero-copy">Manage your Verxor services with a faster, cleaner experience.</p></div><div className="hero-icon"><Globe2 size={21} /></div></section>
    <Card className="balance-card"><div className="balance-top"><span>Available balance</span><ShieldCheck size={18} /></div><div className="balance">₦0.00</div><PrimaryButton onClick={() => go('fund')}><WalletCards size={18} /> Fund wallet</PrimaryButton></Card>
    <SectionHeader eyebrow="SERVICES" title="Quick actions" />
    <div className="action-grid">
      <button className="action-card" onClick={() => go('fund')}><span className="action-icon"><Plus size={20}/></span><span><strong>Fund wallet</strong><small>Add money securely</small></span><span className="arrow">→</span></button>
      <button className="action-card" onClick={() => go('numbers')}><span className="action-icon"><Smartphone size={19}/></span><span><strong>Virtual numbers</strong><small>Browse available numbers</small></span><span className="arrow">→</span></button>
    </div>
    <SectionHeader eyebrow="ACTIVITY" title="Recent activity" action={<button className="text-button" onClick={() => go('history')}>View all</button>} />
    <Card className="empty-card"><div className="empty-icon"><HistoryIcon size={17}/></div><strong>No recent activity</strong><p>Your transactions and orders will appear here.</p></Card>
  </>;
}

export function HistoryPage() {
  return <><SectionHeader eyebrow="ACCOUNT" title="Transaction history" /><Card className="filter-card"><span>All activity</span><span className="filter-pill">All time</span></Card><Card className="empty-card page-empty"><div className="empty-icon"><HistoryIcon size={17}/></div><strong>No transactions yet</strong><p>When you fund your wallet or place an order, it will appear here.</p></Card></>;
}

export function FundPage() {
  return <><section className="page-intro"><p className="eyebrow">WALLET</p><h1>Fund your wallet</h1><p>Choose an amount and a secure payment method.</p></section><Card className="fund-card"><label>Amount</label><div className="amount-input"><span>₦</span><input inputMode="decimal" placeholder="0.00" aria-label="Amount" /></div><div className="amount-options"><button>₦1,000</button><button>₦5,000</button><button>₦10,000</button></div><PrimaryButton><CreditCard size={18}/> Continue to payment</PrimaryButton></Card><Card className="security-note"><ShieldCheck size={19}/><div><strong>Secure payments</strong><p>Your payment details are handled securely.</p></div></Card></>;
}

export function NumbersPage() {
  return <><section className="page-intro"><p className="eyebrow">SERVICES</p><h1>Virtual numbers</h1><p>Choose a number for verification and digital services.</p></section><div className="search-box"><span>⌕</span><input placeholder="Search country or service" /></div><div className="number-list"><Card className="number-card"><div className="number-icon"><Globe2 size={19}/></div><div><strong>United States</strong><small>+1 • Available numbers</small></div><button className="small-button">View</button></Card><Card className="number-card"><div className="number-icon"><Globe2 size={19}/></div><div><strong>United Kingdom</strong><small>+44 • Available numbers</small></div><button className="small-button">View</button></Card></div></>;
}

export function ProfilePage() {
  return <><section className="profile-head"><div className="avatar">V</div><div><p className="eyebrow">ACCOUNT</p><h1>Your profile</h1><p>Manage your account and preferences.</p></div></section><Card className="profile-card"><div className="profile-row"><UserRound size={18}/><div><strong>Personal information</strong><small>Update your account details</small></div><span>→</span></div><div className="profile-row"><ShieldCheck size={18}/><div><strong>Security</strong><small>Protect your account</small></div><span>→</span></div><div className="profile-row"><Settings size={18}/><div><strong>Preferences</strong><small>Customize your experience</small></div><span>→</span></div></Card><Card className="profile-balance"><div><small>Wallet balance</small><strong>₦0.00</strong></div><ArrowUpRight size={19}/></Card></>;
}
