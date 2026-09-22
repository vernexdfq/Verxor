# Verxor deploy (Vercel + Next.js)

## Why the last deploy failed (not your SQL / not “delete everything”)

From your build log:

1. **`next build` actually ran** and listed routes (`/api/health`, `/api/v1/catalog`, webhooks).
2. Vercel then **blocked promotion** because **Next.js 15.2.4** is flagged for **CVE-2025-66478** (“Please update immediately”).
3. Production domain **`verxor.vercel.app`** keeps serving the **last successful (old Vite) deploy** until a **green** Next deploy is assigned to Production.

**Do not delete the project or re-add all API keys.** Fix the version and redeploy.

## Fix (already in repo when package.json has next ≥ 15.2.6 / 15.5.7)

1. Wait for the new commit on `main` (Next **15.5.7**).
2. Vercel → project linked to **`vernexdfq/Verxor`**
3. **Settings → General**
   - Framework Preset: **Next.js**
   - Build Command: `next build`
   - Output Directory: **empty**
   - Install Command: `npm install`
   - **Node.js Version: 20.x** (not 24.x if builds act odd)
4. **Settings → Domains**
   - Confirm **`verxor.vercel.app`** is on **this** project (not an old Vite project).
5. **Deployments** → latest `main` → **Redeploy** → **Clear cache and redeploy**
6. Open the deployment → **Promote to Production** if it is only a Preview.

## Success checks

```text
https://verxor.vercel.app/api/health
https://verxor.vercel.app/api/v1/catalog
```

Must return **JSON**, not Vercel HTML 404.

Preview URLs (from a successful deploy) also work, e.g. `https://verxor-git-main-….vercel.app/api/health`.
