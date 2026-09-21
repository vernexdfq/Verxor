# Verxor

Next.js App Router platform (UI + API).

## Stack

- Next.js 15 + React 18
- Vercel deploy
- Supabase, Flutterwave, 5SIM / Grizzly / TextVerified / SMSBower (env only)

## Local

```bash
npm install
cp .env.example .env.local   # fill locally, never commit
npm run dev
```

## Env

Set the same names from `.env.example` in **Vercel → Settings → Environment Variables** (Production + Preview).

## Health

After deploy: `GET /api/health` — shows which env groups are present (boolean only, no secrets).

## Webhooks

- `POST /api/webhooks/flutterwave`
- `POST /api/webhooks/grizzlysms`
- `POST /api/webhooks/textverified`
- `POST /api/webhooks/smsbower`

Point provider dashboards at `https://verxor.vercel.app/api/webhooks/...`
