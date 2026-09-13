import { useState } from 'react';
import { ArrowLeft, Hash, MessageSquare, Phone, Plus, WalletCards } from 'lucide-react';
import { Card, PrimaryButton } from './components/ui';
import './rental-page.css';

type Tab = 'calls' | 'messages' | 'numbers' | 'credit';

export function RentalPage({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('calls');
  const [dial, setDial] = useState('');
  const keys = ['1','2','3','4','5','6','7','8','9','*','0','#'];
  return <div className="rental-page">
    <header className="rental-header"><button className="rental-icon-button" onClick={onBack} aria-label="Back"><ArrowLeft size={19}/></button><div><span className="eyebrow">DEDICATED LINE</span><h1>Rent a Line</h1></div><button className="rental-icon-button primary" aria-label="Rent a number"><Plus size={20}/></button></header>
    <p className="rental-intro">Keep a dedicated number for the period you need. Voice and SMS are shown only where supported by the connected provider.</p>
    {tab === 'calls' && <section className="rental-content"><div className="rental-section-heading"><div><span className="eyebrow">CALLS</span><h2>Make a call</h2></div></div><Card className="from-line"><div><small>CALLING FROM</small><strong>No active rented line</strong><span>Rent a number to enable outbound calling.</span></div></Card><div className="dial-display">{dial || 'Enter a number'}</div><div className="dial-grid">{keys.map((key) => <button key={key} onClick={() => setDial(`${dial}${key}`.slice(0,18))}><strong>{key}</strong></button>)}</div><div className="dial-actions"><button className="call-button" disabled={!dial} aria-label="Call"><Phone size={24} fill="currentColor"/></button><button className="delete-button" onClick={() => setDial(dial.slice(0,-1))} aria-label="Delete">⌫</button></div></section>}
    {tab === 'messages' && <Empty title="SMS inbox" icon={<MessageSquare size={23}/>} text="Messages received by active rented lines will appear here when SMS is supported."/>}
    {tab === 'numbers' && <section className="rental-content"><div className="rental-section-heading"><div><span className="eyebrow">NUMBERS</span><h2>Your rented lines</h2></div></div><Card className="rental-empty"><Hash size={23}/><strong>No active rentals</strong><p>Your active numbers, expiry dates, capabilities and status will appear here.</p><PrimaryButton><Plus size={17}/> Browse numbers</PrimaryButton></Card></section>}
    {tab === 'credit' && <section className="rental-content"><div className="rental-section-heading"><div><span className="eyebrow">CREDIT</span><h2>Rental credit</h2></div></div><Card className="credit-card"><div><small>AVAILABLE WALLET BALANCE</small><strong>Account balance</strong><span>Final currency and balance come from your account.</span></div><WalletCards size={24}/></Card></section>}
    <nav className="rental-tabs" aria-label="Rental navigation">{([['calls','Calls',Phone],['messages','Messages',MessageSquare],['numbers','Numbers',Hash],['credit','Credit',WalletCards]] as const).map(([id,label,Icon]) => <button key={id} className={tab===id?'active':''} onClick={() => setTab(id)}><Icon size={18}/><span>{label}</span></button>)}</nav>
  </div>;
}
function Empty({ title, icon, text }: { title: string; icon: React.ReactNode; text: string }) { return <section className="rental-content"><div className="rental-section-heading"><div><span className="eyebrow">MESSAGES</span><h2>{title}</h2></div></div><Card className="rental-empty">{icon}<strong>No messages yet</strong><p>{text}</p></Card></section>; }
