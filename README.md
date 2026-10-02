# Verxor

Digital services platform (Next.js App Router).

## Stack

- **Next.js 15** + React 18 + TypeScript
- **Deploy:** Vercel (primary)
- **DNS:** Cloudflare
- **Optional fallback:** Cloudflare Workers via OpenNext (`npm run cf:deploy`)

## Local

```bash
npm install
npm run dev
```

## Deploy

See **[DEPLOY.md](./DEPLOY.md)** for Vercel setup + Cloudflare DNS.

```bash
npm run build   # production build (what Vercel runs)
```
