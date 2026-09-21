# Verxor deploy (Vercel + Next.js)

## Critical: production must be Next.js

If `https://verxor.vercel.app/api/health` returns **404 NOT_FOUND**, production is still the **old Vite** build.

### Fix on Vercel (once)

1. Project linked to repo **`vernexdfq/Verxor`**, branch **`main`**
2. **Settings → General**
   - Framework Preset: **Next.js**
   - Build Command: `next build`
   - Output Directory: **empty** (do not set `.next` or `dist`)
   - Install Command: `npm install`
   - Node.js Version: **20.x**
3. **Settings → Environment Variables** — Production (and Preview if needed)
4. **Deployments →** latest commit → **Redeploy** with **Clear cache and redeploy**

### Success checks

```text
GET https://verxor.vercel.app/api/health
GET https://verxor.vercel.app/api/v1/catalog
GET https://verxor.vercel.app/api/v1/providers/status
```

All three must return **JSON**, not a Vercel HTML 404 page.

### Supabase

Run `supabase/schema.sql` in the Supabase SQL Editor once.
