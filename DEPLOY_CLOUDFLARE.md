# Deploy Verxor on Cloudflare (while Vercel is unavailable)

Verxor uses **Cloudflare Workers + OpenNext** so the same Next.js 15 App Router app runs without Vercel.

Official path: [@opennextjs/cloudflare](https://opennext.js.org/cloudflare) → Cloudflare Workers (Static Assets).

---

## 1. One-time: Cloudflare account

1. Sign up / log in at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Install deps and log Wrangler into your account:

```bash
cd Verxor   # or clone the repo
npm install
npx wrangler login
```

Browser opens → authorize Wrangler.

---

## 2. Deploy from your machine

```bash
npm run deploy
```

This runs:

1. `opennextjs-cloudflare build` (Next build + Workers adapter)
2. `opennextjs-cloudflare deploy` (upload Worker + assets)

After success you get a URL like:

`https://verxor.<your-subdomain>.workers.dev`

Optional custom domain in the Cloudflare dashboard → Workers → verxor → Triggers / Custom domains.

---

## 3. Local preview (Workers runtime)

```bash
npm run preview
```

Normal Next dev (faster iteration):

```bash
npm run dev
```

---

## 4. Git-connected deploys (optional)

In Cloudflare Dashboard:

1. **Workers & Pages** → **Create** → connect **GitHub** → select `vernexdfq/Verxor`
2. Build settings (Workers + OpenNext):
   - **Build command:** `npx opennextjs-cloudflare build`
   - **Deploy command:** `npx opennextjs-cloudflare deploy`
   - Or use Cloudflare’s “Next.js” template if offered for this repo
3. Set any secrets (Supabase, API keys) under **Settings → Variables and Secrets**

---

## 5. Environment variables

Copy from `.env.example` / previous Vercel env:

```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
# add others as needed
```

For `NEXT_PUBLIC_*` values that must be inlined at build time, put them in a local `.env` / `.env.production` **before** `npm run deploy`, or configure them in the Cloudflare Git build environment.

---

## 6. Files added for Cloudflare

| File | Role |
|------|------|
| `wrangler.jsonc` | Worker name, `nodejs_compat`, assets binding |
| `open-next.config.ts` | OpenNext Cloudflare adapter config |
| `package.json` scripts | `preview`, `deploy`, `cf-typegen` |

Vercel config (`vercel.json`) can stay for when the Vercel account is restored; it does not affect Cloudflare.

---

## 7. After Vercel is back

You can deploy to both:

- **Cloudflare** = current production / staging  
- **Vercel** = optional second environment  

No need to delete Cloudflare config.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `nodejs_compat` errors | Keep `compatibility_flags: ["nodejs_compat"]` in `wrangler.jsonc` |
| Build OOM on free CI | Deploy from a local machine with Node 20+ |
| Missing env at runtime | Set secrets via `wrangler secret put` or dashboard |
| Old cached Worker | Redeploy; hard-refresh the workers.dev URL |
