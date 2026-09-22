import { useMemo, useState } from 'react';
import { Building2, Check, CreditCard, Plus, ShieldCheck, Smartphone, WalletCards } from 'lucide-react';
import { Card, PrimaryButton } from './components/ui';

const region = {
  code: 'NGN',
  symbol: '₦',
  label: 'Nigeria',
  presets: [2000, 5000, 10000, 25000],
  methods: [
    { id: 'bank', title: 'Bank transfer', description: 'Pay with your Nigerian bank', icon: 'bank' as const },
    { id: 'card', title: 'Card', description: 'Visa, Mastercard, Verve', icon: 'card' as const },
    { id: 'ussd', title: 'USSD', description: 'Pay from any mobile line', icon: 'ussd' as const },
  ],
};

const wallet = { amount: '0.00', code: region.code, symbol: region.symbol, regionLabel: region.label };

function formatMoney(value: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: wallet.code,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${wallet.symbol}${value}`;
  }
}

export function FundPage() {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(region.methods[0]?.id ?? 'card');
  const [status, setStatus] = useState<'idle' | 'ready'>('idle');

  const numeric = useMemo(() => {
    const n = Number(String(amount).replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [amount]);

  const canContinue = numeric > 0 && Boolean(method);

  return (
    <>
      <section className="page-intro fund-intro">
        <p className="eyebrow">WALLET</p>
        <h1>Fund</h1>
        <p>
          Add money in {wallet.code}. Methods match your account region ({wallet.regionLabel}).
        </p>
      </section>

      <Card className="fund-summary">
        <div>
          <span>AVAILABLE BALANCE · {wallet.code}</span>
          <strong>
            {wallet.symbol}
            {wallet.amount}
          </strong>
        </div>
        <WalletCards size={22} />
      </Card>

      <Card className="fund-card fund-card-clean">
        <label htmlFor="fund-amount">Amount</label>
        <div className="amount-input">
          <span>{wallet.symbol}</span>
          <input
            id="fund-amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value.replace(/[^0-9.]/g, ''));
              setStatus('idle');
            }}
            aria-label="Funding amount"
          />
        </div>

        <div className={`amount-options amount-options-${region.presets.length}`}>
          {region.presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={numeric === preset ? 'preset-active' : undefined}
              onClick={() => {
                setAmount(String(preset));
                setStatus('idle');
              }}
            >
              {formatMoney(preset)}
            </button>
          ))}
        </div>

        <div className="fund-method-block">
          <span className="fund-method-label">Payment method</span>
          <div className="fund-method-list" role="radiogroup" aria-label="Payment method">
            {region.methods.map((m) => {
              const active = method === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`fund-method${active ? ' active' : ''}`}
                  onClick={() => {
                    setMethod(m.id);
                    setStatus('idle');
                  }}
                >
                  <span className="fund-method-icon">
                    {m.icon === 'card' ? (
                      <CreditCard size={18} />
                    ) : m.icon === 'bank' ? (
                      <Building2 size={18} />
                    ) : (
                      <Smartphone size={18} />
                    )}
                  </span>
                  <span className="fund-method-copy">
                    <strong>{m.title}</strong>
                    <small>{m.description}</small>
                  </span>
                  <span className={`fund-method-check${active ? ' on' : ''}`} aria-hidden>
                    {active ? <Check size={14} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <PrimaryButton
          disabled={!canContinue}
          onClick={() => {
            if (canContinue) setStatus('ready');
          }}
        >
          {status === 'ready' ? (
            <>
              <Check size={18} /> Ready for checkout
            </>
          ) : (
            <>
              <Plus size={18} /> Continue
            </>
          )}
        </PrimaryButton>

        {status === 'ready' && (
          <p className="fund-ready-note">
            Amount {formatMoney(numeric)} via {region.methods.find((x) => x.id === method)?.title}. Checkout opens
            once the live session is wired for your region.
          </p>
        )}
      </Card>

      <Card className="security-note">
        <ShieldCheck size={19} />
        <div>
          <strong>Secure funding</strong>
          <p>Confirmation and wallet credit appear in History after the payment provider confirms.</p>
        </div>
      </Card>
    </>
  );
}
