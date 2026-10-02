# Verxor deploy — Vercel (primary) + Cloudflare DNS

**Deploy host:** Vercel (Next.js)
**DNS / domain:** Cloudflare (you keep nameservers & DNS records there)

---

## 1. Connect the GitHub repo on Vercel

1. Open [vercel.com](https://vercel.com) → **Add New… → Project**
2. Import **`vernexdfq/Verxor`**
3. Framework Preset: **Next.js** (auto-detected)
4. Root Directory: `.` (leave default)
5. Build Command: `next build` (or leave blank — uses package.json)
6. Output Directory: **leave empty**
7. Install Command: `npm install`
8. Node.js Version: **20.x**
9. Click **Deploy** once (first deploy can succeed without env vars; APIs that need keys will fail until you add them)

---

## 2. Environment variables (Vercel → Project → Settings → Environment Variables)

Add for **Production** (and Preview if you want):

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

FLUTTERWAVE_PUBLIC_KEY
FLUTTERWAVE_SECRET_KEY
FLUTTERWAVE_ENCRYPTION_KEY
FLUTTERWAVE_SECRET_HASH

FIVESIM_API_KEY
GRIZZLYSMS_API_KEY
TEXTVERIFIED_API_KEY
SMSBOWER_API_KEY

SMMWIZ_API_URL
SMMWIZ_API_KEY
BULKFOLLOWS_API_URL
BULKFOLLOWS_API_KEY
```

See `.env.example` for the full list. **Never commit real values.**

After saving env vars → **Deployments → … → Redeploy** (clear cache if needed).

---

## 3. Custom domain via Cloudflare DNS (DNS stays on Cloudflare)

### On Vercel
1. Project → **Settings → Domains**
2. Add your domain, e.g. `verxor.com` and/or `www.verxor.com`
3. Vercel will show the target (usually a CNAME to `cname.vercel-dns.com`)

### On Cloudflare (DNS only — do not proxy incorrectly)

| Type  | Name | Content                 | Proxy status      |
|-------|------|-------------------------|-------------------|
| CNAME | `@`  | `cname.vercel-dns.com`  | **DNS only** (grey cloud) *or* follow Vercel’s exact instruction |
| CNAME | `www`| `cname.vercel-dns.com`  | DNS only / as Vercel shows |

**Important:**
- For apex (`@`), if Cloudflare requires A records, use the IPs Vercel lists in the Domains panel.
- Start with **DNS only** (grey cloud) until the domain is verified on Vercel; then you can enable orange-cloud proxy if you want Cloudflare CDN in front.
- SSL: Cloudflare → Full (strict) once Vercel has issued the cert.

---

## 4. Success checks

After a green Production deploy:

```text
https://YOUR-PROJECT.vercel.app/
https://YOUR-PROJECT.vercel.app/api/health
```

Custom domain (when DNS propagates):

```text
https://verxor.com/
https://www.verxor.com/
```

Must show the app / JSON — not a Cloudflare Worker error page.

---

## 5. Cloudflare Workers (optional fallback only)

The repo still has OpenNext + Wrangler for emergency Workers deploys:

```bash
npm run cf:deploy
```

Primary production path is **Vercel**. GitHub Actions CI now only **builds** (no auto-deploy to Workers).

---

## 6. Local

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.
