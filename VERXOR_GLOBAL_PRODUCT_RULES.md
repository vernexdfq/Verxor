# Verxor Global Product Rules

These rules apply to every customer-facing product screen.

## Global by default

Verxor is a global digital-services platform. Nigeria is one supported market, not the product's visual or architectural boundary.

- Do not hardcode Nigeria-only wording into shared UI.
- Country, phone-number format, currency, language, timezone and service availability must be data-driven.
- Never assume `NGN`, `+234`, or a Nigerian-only payment method in reusable components.
- The UI may show a selected account currency or market, but that value must come from account/region data in production.
- Country and service catalogs must be designed to scale beyond a fixed list.

## Navigation

Primary mobile navigation is locked to four destinations:

1. Home
2. Numbers
3. Fund
4. Profile

History is a secondary destination reached from Home's Recent Activity / View all and may be reached contextually from Numbers.

## Numbers architecture

The Numbers page is a clean entry hub with two choices:

- Virtual Numbers — OTP verification
- Rent a Line — longer-term numbers

After a choice, the user enters a focused flow. Do not force users back through the hub between steps.

## Home architecture

Home is the command center:

- Greeting + notification
- Wallet card: balance, visibility control, Fund Wallet, History
- Four Quick Actions: Virtual Numbers, Rent a Line, SMM Boost, Buy Accounts
- Recent Activity + View all

SMM Boost and Buy Accounts remain Quick Actions in Phase 1 and do not enter bottom navigation.

## Product language

Use short, direct labels. Prefer product names and clear actions over marketing paragraphs inside the app.

Good: `Virtual Numbers`, `Rent a Line`, `SMM Boost`, `Buy Accounts`, `Fund Wallet`.

Avoid long explanatory copy when a concise label is enough.

## Engineering rule

Presentation must not invent backend behavior. Real inventory, balances, payments, order status, provider responses and currency values will be connected through the proper data/service layer when the Verxor backend is connected.
