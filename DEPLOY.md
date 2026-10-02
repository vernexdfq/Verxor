# Verxor deploy — Vercel (primary) + Cloudflare DNS

**Deploy host:** Vercel (Next.js)  
**DNS:** Cloudflare  

**Build status:** Local `next build` on latest `main` **succeeds**. Gift card syntax error is fixed.

---

## Redeploy on Vercel (if you already imported the project)

1. Open **vercel.com** → project **verxor**
2. Go to **Deployments** (list view — not an old failed log)
3. Find the **newest** deployment from `main`
4. Tap **⋯** → **Redeploy** → turn ON **Clear cache and redeploy**
5. Wait for green status

The failed log you saw (`HvUD9bJ5m`, time ~08:07) is the **old** build before the fix. Do not keep refreshing that page.

---

## First-time import

1. **Add New → Project** → import `vernexdfq/Verxor`
2. Framework: **Next.js** | Root: `.` | Build: `next build` | Output: empty | Node: **20.x**
3. Deploy

---

## Environment variables

Settings → Environment Variables — use names from `.env.example`, then Redeploy.

---

## Custom domain (DNS stays on Cloudflare)

Vercel → Domains → add domain.  
Cloudflare DNS: CNAME `www` → `cname.vercel-dns.com` (DNS only first).

---

## Success checks

```text
https://YOUR-PROJECT.vercel.app/
https://YOUR-PROJECT.vercel.app/api/health
```
