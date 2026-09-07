import { StrictMode, useState } from 'react';
import { ArrowRight, Check, Globe2, Menu, ShieldCheck, X, Zap } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components/AppShell';
import { HomePage, HistoryPage, FundPage, NumbersPage, ProfilePage } from './pages';
import type { Page } from './types';
import './styles.css';

const services = [
  { title: 'Virtual Numbers', label: 'Instant OTP', description: 'Fast verification numbers for WhatsApp, TikTok, Instagram, Google and 300+ services.' },
  { title: 'Rent a Line', label: 'Dedicated rentals', description: 'Keep a private USA or global number for hours or days with voice and SMS support.' },
  { title: 'SMM Boost', label: 'Social & music growth', description: 'Order followers, likes, views and streams with clear delivery tracking.' },
  { title: 'Buy Accounts', label: 'Premium accounts', description: 'Browse available aged and verified profiles and receive delivery after payment.' },
];
const countries = [['🇮🇳','India'],['🇮🇩','Indonesia'],['🇺🇦','Ukraine'],['🇿🇦','South Africa'],['🇪🇸','Spain'],['🇮🇹','Italy'],['🇹🇷','Turkey'],['🇲🇽','Mexico'],['🇺🇸','United States'],['🇬🇧','United Kingdom'],['🇨🇦','Canada'],['🇫🇷','France']];
const faqs = [
  ['What is the difference between a Virtual Number and Rent?', 'Virtual Numbers are temporary lines for OTP verification. Rental numbers are dedicated to you for a selected period and can support voice and SMS.'],
  ['Which platforms can I verify with Verxor?', 'Verxor supports a wide range of online services. Availability depends on the country, platform and current number inventory.'],
  ['How do I fund my wallet?', 'Open Fund Wallet after signing in and follow the available funding instructions. Your balance updates after payment confirmation.'],
  ['What happens if an OTP does not arrive?', 'When a service supports automatic refund handling, an unsuccessful order is returned according to the applicable service rules.'],
];

function Landing({ enter }: { enter: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="landing">
    <header className="landing-header"><div className="landing-nav">
      <a href="#top" className="wordmark"><span className="wordmark-mark">V</span><span>Verxor<span className="wordmark-dot">.</span>com</span></a>
      <nav className="desktop-links"><a href="#services">Services</a><a href="#coverage">Coverage</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></nav>
      <div className="landing-actions"><button className="login-link" onClick={enter}>Log in</button><button className="landing-cta compact" onClick={enter}>Get started</button><button className="menu-button" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">{menuOpen ? <X size={21}/> : <Menu size={21}/>}</button></div>
    </div>{menuOpen && <nav className="mobile-menu"><a href="#services" onClick={() => setMenuOpen(false)}>Services</a><a href="#coverage" onClick={() => setMenuOpen(false)}>Coverage</a><a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a><a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a><button className="landing-cta" onClick={enter}>Get started <ArrowRight size={17}/></button></nav>}</header>
    <main id="top">
      <section className="landing-hero"><div className="hero-copy-wrap">
        <div className="status-pill"><span className="status-dot"/> Canada &amp; USA — OTP ready</div>
        <h1>Your second number, <span>anywhere in the world.</span></h1>
        <p>Verify accounts, rent dedicated numbers, grow your social presence and manage your digital services from one reliable platform.</p>
        <div className="hero-actions"><button className="landing-cta" onClick={enter}>Get a number now <ArrowRight size={18}/></button><a className="secondary-link" href="#services">Explore services</a></div>
        <div className="trust-row"><span><ShieldCheck size={16}/> Secure checkout</span><span><Zap size={16}/> Fast delivery</span><span><Globe2 size={16}/> Global coverage</span></div>
      </div><div className="hero-preview"><div className="preview-header"><div><span>VERXOR</span><strong>Digital services</strong></div><span className="preview-status">LIVE</span></div><div className="preview-balance"><small>Wallet balance</small><strong>₦0.00</strong></div><div className="preview-grid"><div><span className="preview-icon blue">#</span><strong>OTP numbers</strong><small>Instant verification</small></div><div><span className="preview-icon navy">◉</span><strong>Rent a line</strong><small>Dedicated numbers</small></div><div><span className="preview-icon blue">↗</span><strong>Social growth</strong><small>Track every order</small></div><div><span className="preview-icon navy">✓</span><strong>Accounts</strong><small>Ready when you are</small></div></div></div></section>
      <section className="stats-strip"><div><strong>50+</strong><span>Countries</span></div><div><strong>200K+</strong><span>Numbers delivered</span></div><div><strong>98%</strong><span>OTP success target</span></div><div><strong>24/7</strong><span>Platform access</span></div></section>
      <section id="services" className="landing-section"><div className="section-intro"><span>Services</span><h2>One toolkit. Every essential service.</h2><p>Everything is organized around a simple wallet-first experience, so you can find what you need without navigating a maze.</p></div><div className="service-grid">{services.map((service,i)=><button className="service-card" key={service.title} onClick={enter}><div className={`service-number n${i+1}`}>0{i+1}</div><div><span className="service-label">{service.label}</span><h3>{service.title}</h3><p>{service.description}</p><span className="service-link">Open service <ArrowRight size={15}/></span></div></button>)}</div></section>
      <section id="coverage" className="coverage-section"><div className="landing-section coverage-inner"><div className="section-intro"><span>Coverage</span><h2>Global numbers, clearly presented.</h2><p>Browse supported markets and check current availability inside your account.</p></div><div className="country-grid">{countries.map(([flag,name])=><button key={name} onClick={enter}><span>{flag}</span><strong>{name}</strong><ArrowRight size={15}/></button>)}</div></div></section>
      <section id="pricing" className="landing-section"><div className="pricing-panel"><div><span>Simple funding</span><h2>Start with what you need.</h2><p>Fund your Naira wallet, then pay for the services you actually use. No complicated plans required.</p></div><div className="pricing-points">{['Wallet-first payments','Clear service pricing','Fast automated delivery','Referral rewards'].map(item=><div key={item}><Check size={17}/>{item}</div>)}</div><button className="landing-cta" onClick={enter}>Create a free account <ArrowRight size={18}/></button></div></section>
      <section id="faq" className="landing-section faq-section"><div className="section-intro centered"><span>Support</span><h2>Questions, answered.</h2></div><div className="faq-list">{faqs.map(([q,a])=><details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
    </main><footer className="landing-footer"><div className="footer-brand"><span className="wordmark-mark">V</span><strong>Verxor.com</strong></div><span>© {new Date().getFullYear()} Verxor.com — Connect · Verify · Grow</span></footer>
  </div>;
}

function App() {
  const [dark,setDark]=useState(false); const [view,setView]=useState<'landing'|'app'>('landing'); const [page,setPage]=useState<Page>('home');
  if(view==='landing') return <div className={dark?'app dark':'app'}><Landing enter={()=>setView('app')}/></div>;
  const content={home:<HomePage go={setPage}/>,history:<HistoryPage/>,fund:<FundPage/>,numbers:<NumbersPage/>,profile:<ProfilePage/>}[page];
  return <AppShell dark={dark} page={page} onNavigate={setPage} onToggleTheme={()=>setDark(v=>!v)}>{content}</AppShell>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
