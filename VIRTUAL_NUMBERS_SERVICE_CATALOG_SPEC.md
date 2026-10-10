# Virtual Numbers — Service Catalogue & Logo Contract

This note is the implementation contract for future work on the Virtual Numbers page.

## Approved list-screen design
- Keep the existing Verxor light palette, page header, wallet balance, search field, horizontal category chips, and single-column rounded service list.
- Each row has a real service brand mark in a restrained white rounded-square tile, the service display name, and a right chevron.
- Use official/recognizable logos when available. Never use a colored rectangle with a single initial as a pretend logo. If a brand logo cannot load, show the neutral app icon fallback rather than inventing a mark.
- Keep the service list mobile-first and prevent horizontal overflow.
- Keep provider identities, provider IDs, API keys, and raw provider payloads server-side; never display provider names in customer-facing catalogue rows.

## Provider-driven catalogue requirement
The current `src/virtual-numbers-data.ts` `SERVICES` array is a curated static fallback, and the current purchase flow still calls `mockPrices()`. Do not represent these as a live provider catalogue.

When implementing the live catalogue:
1. Add/extend a server-side service module and same-origin API route to normalize the service IDs/names/categories returned by configured providers.
2. Aggregate and deduplicate services across configured providers. A service appears when at least one configured provider supports it; do not hardcode a fixed count such as 40.
3. Normalize provider-specific service codes into a stable internal `serviceId`, while retaining each provider's own code only on the server for pricing/purchase calls.
4. Return customer-safe fields only: `id`, `name`, `category`, and optionally an availability indicator. Never return API keys or raw provider records.
5. Drive search, category counts, and the visible list from the normalized API response. Keep the current static list only as a clearly handled fallback when the endpoint is unavailable; show a loading state and a useful error/empty state.
6. A selected service must resolve to at least one real provider offer for the chosen country and pool. Replace `mockPrices()` with server-fetched live offers before calling the purchase action; never fabricate stock, prices, phone numbers, or OTPs.
7. Preserve the existing pool → service → country → offer → confirmation flow and existing order semantics while this data layer is connected.
8. Provider support differs. Do not assume every provider exposes a complete service-list endpoint. Implement and document each provider's actual capability; partial provider failures must not hide valid services from other configured providers.

## Files in scope
- `src/virtual-numbers-components.tsx`: brand logo presentation.
- `src/virtual-numbers-page.css`: service-row presentation.
- `src/virtual-numbers-data.ts` and `src/virtual-numbers-page.tsx`: future dynamic catalogue and live offers, without replacing working pool/navigation UI.
- `app/api/v1/catalog/route.ts` and `lib/providers/*`: server-side normalization only as needed.

Do not rewrite the whole Virtual Numbers page for a logo/catalogue change. Keep the working route selection and purchase flow intact until live provider-backed offers are fully wired and verified.
