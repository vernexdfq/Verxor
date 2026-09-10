import type { ReactNode } from 'react';
import { ArrowRight, Bell, Clock3, Eye, History, LockKeyhole, LogOut, Plus, ShieldCheck, Smartphone, UserRound, WalletCards, Zap } from 'lucide-react';
import { Card, PrimaryButton, SectionHeader } from './components/ui';
import type { Page } from './types';
import type { ServiceView } from './service-pages';

const balance = '0.00';

export function HomePage({ go, openService }: { go: (page: Page) => void; openService: (view: ServiceView) => void }) {
  return <>
    <section className="home-heading">
      <div><p className="eyebrow">WELCOME BACK</p><h1>Good morning, Denny</h1><p>Manage your numbers, orders and wallet in one place.</p></div>
      <button className="notification-button" aria-label="Notifications" onClick={() => openService('alerts')}><Bell size={20} /></button>
    </section>
    <Card className="wallet-card">
      <div className="wallet-card-top"><span>AVAILABLE BALANCE</span><span className="wallet-status"><i /> Active</span></div>
      <div className="wallet-amount-row"><strong>{balance}</strong><button className="balance-visibility" aria-label="Show balance"><Eye size={18} /></button></div>
      <div className="wallet-actions"><button className="wallet-primary" onClick={() => go('fund')}><Plus size={18} /> Fund Wallet</button><button className="wallet-secondary" onClick={() => go('history')}><History size={18} /> History</button></div>
    </Card>
    <SectionHeader eyebrow="SERVICES" title="Quick actions" />
    <div className="quick-grid">
      <button className="quick-card" onClick={() => openService('virtual-numbers')}><span className="quick-icon"><Smartphone size={21} /></span><strong>Virtual Numbers</strong><small>OTP verification</small><ArrowRight size={16} className="quick-arrow" /></button>
      <button className="quick-card" onClick={() => openService('rental')}><span className="quick-icon"><Clock3 size={21} /></span><strong>Rent a Line</strong><small>Long-term numbers</small><ArrowRight size={16} className="quick-arrow" /></button>
      <button className="quick-card" onClick={() => openService('boost')}><span className="quick-icon"><Zap size={21} /></span><strong>SMM Boost</strong><small>Social growth</small><ArrowRight size={16} className="quick-arrow" /></button>
      <button className="quick-card" onClick={() => openService('accounts')}><span className="quick-icon"><UserRound size={21} /></span><strong>Buy Accounts</strong><small>Available inventory</small><ArrowRight size={16} className="quick-arrow" /></button>
    </div>
    <SectionHeader eyebrow="ACTIVITY" title="Recent activity" action={<button className="text-button" onClick={() => go('history')}>View all <ArrowRight size={14} /></button>} />
    <Card className="activity-empty"><div className="activity-empty-icon"><History size={19} /></div><strong>No recent activity</strong><p>Your latest wallet activity and orders will appear here.</p></Card>
  </>;
}

export function HistoryPage() {
  return <><section className="page-intro"><p className="eyebrow">ACTIVITY</p><h1>History</h1><p>Wallet activity and service orders in one timeline.</p></section><div className="history-filters"><button className="filter-active">All</button><button>Wallet</button><button>Numbers</button><button>Orders</button></div><Card className="activity-empty page-empty"><div className="activity-empty-icon"><History size={19} /></div><strong>No activity yet</strong><p>Fund your wallet or place an order and your activity will appear here.</p></Card></>;
}

export function FundPage() {
  return <><section className="page-intro"><p className="eyebrow">WALLET</p><h1>Fund</h1><p>Add funds securely and keep your service balance ready.</p></section><Card className="fund-summary"><div><span>AVAILABLE BALANCE</span><strong>{balance}</strong></div><WalletCards size={22} /></Card><Card className="fund-card"><label htmlFor="fund-amount">Amount</label><div className="amount-input"><span>₦</span><input id="fund-amount" inputMode="decimal" placeholder="0.00" aria-label="Funding amount" /></div><div className="amount-options"><button>₦1,000</button><button>₦5,000</button><button>₦10,000</button></div><PrimaryButton><Plus size={18} /> Continue</PrimaryButton></Card><Card className="security-note"><ShieldCheck size={19} /><div><strong>Secure funding</strong><p>Payment confirmation and wallet updates are shown in your activity.</p></div></Card></>;
}

export function NumbersPage({ openService }: { openService: (view: ServiceView) => void }) {
  return <><section className="page-intro numbers-intro"><p className="eyebrow">NUMBERS</p><h1>Choose a number service</h1><p>Use a virtual number for OTPs or rent a line for longer-term access.</p></section><div className="number-choice-list">
    <button className="number-choice" onClick={() => openService('virtual-numbers')}><span className="number-choice-icon"><Smartphone size={22} /></span><span><strong>Virtual Numbers</strong><small>OTP verification</small></span><ArrowRight size={18} /></button>
    <button className="number-choice" onClick={() => openService('rental')}><span className="number-choice-icon"><Clock3 size={22} /></span><span><strong>Rent a Line</strong><small>Long-term numbers</small></span><ArrowRight size={18} /></button>
  </div><SectionHeader eyebrow="ACTIVITY" title="Number history" action={<button className="text-button">View all <ArrowRight size={14} /></button>} /><Card className="activity-empty"><div className="activity-empty-icon"><History size={19} /></div><strong>No number activity</strong><p>Your number orders and rentals will appear here.</p></Card></>;
}

export function ProfilePage({ openService }: { openService: (view: ServiceView) => void }) {
  return <><section className="profile-summary"><div className="profile-avatar">V</div><div><p className="eyebrow">ACCOUNT</p><h1>Your profile</h1><p>Member since 2026</p></div></section>
    <ProfileGroup title="ACCOUNT INFORMATION"><ProfileItem icon={<UserRound size={19} />} title="Personal information" description="Name, username, phone and email" /></ProfileGroup>
    <ProfileGroup title="SECURITY"><ProfileItem icon={<LockKeyhole size={19} />} title="Security" description="Password, PIN and sessions" onClick={() => openService('settings')} /></ProfileGroup>
    <ProfileGroup title="SUPPORT"><ProfileItem icon={<ShieldCheck size={19} />} title="Help Center" description="Guides and common questions" onClick={() => openService('privacy')} /><ProfileItem icon={<Bell size={19} />} title="Contact Support" description="Get help with an issue" onClick={() => openService('feedback')} /></ProfileGroup>
    <button className="logout-button"><LogOut size={18} /> Log out</button>
  </>;
}

function ProfileGroup({ title, children }: { title: string; children: ReactNode }) { return <section className="profile-group"><h2>{title}</h2><Card className="profile-list">{children}</Card></section>; }
function ProfileItem({ icon, title, description, onClick }: { icon: ReactNode; title: string; description: string; onClick?: () => void }) { const Tag = onClick ? 'button' : 'div'; return <Tag className="profile-item" onClick={onClick}><span className="profile-item-icon">{icon}</span><span><strong>{title}</strong><small>{description}</small></span>{onClick && <ArrowRight size={17} />}</Tag>; }
