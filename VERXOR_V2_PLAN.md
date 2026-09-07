# Verxor V2 — source-of-truth and rebuild plan

## Source of truth
The legacy production repository is `vernexdfq/vernex-boost-hub`. V2 must preserve its product vocabulary, service set, routes, brand palette, and working integrations while replacing duplicated/fragile presentation code.

## Product areas found in the legacy application
- Public landing page
- Phone/email authentication and PIN flow
- Dashboard
- Wallet funding
- Transaction history
- Virtual numbers / OTP
- Number orders
- SMM boost and boost orders
- Account purchasing and log history
- Dedicated number rental
- Rewards and affiliate website
- Alerts
- Profile
- Feedback and privacy pages
- Admin pricing
- Flutterwave webhook/server functionality

## Visual source of truth
The legacy stylesheet establishes the core visual language:
- Primary blue: `#2563EB`
- Deep navy: `#0A1F44`
- Light page: `#F6F8FC` / landing surface `#F4F5FC`
- Surface: `#FFFFFF`
- Secondary surface: `#F8FAFC`
- Border: `#E2E8F0`
- Muted text: `#64748B`
- Success: `#16A34A`
- Dark background: `#080D18`
- Dark surface: `#0F1726`
- Display type: Plus Jakarta Sans
- UI type: Inter

## V2 UI rules
1. One responsive content rail per application context.
2. One spacing scale; no arbitrary page-specific gutters.
3. Cards use a deliberate radius hierarchy rather than blanket rounding.
4. Interactive controls remain visually distinct from cards.
5. No decorative floating animations that make the product feel synthetic.
6. No horizontal overflow at common mobile widths.
7. Long numbers, IDs and URLs must wrap safely.
8. Light and dark themes share the same semantic design tokens.
9. Business logic, API calls, queries and authentication are not rewritten as part of visual cleanup.
10. Every major route is reviewed at 320, 375, 390, 412, 448, 768 and desktop widths before being considered finished.

## Current V2 progress
- Clean repository initialized.
- Responsive foundation created.
- Original landing-page content and palette reviewed.
- Landing page rebuilt with the original Verxor messaging, services, coverage, pricing and FAQ structure, using restrained production styling.
- Mobile navigation and responsive breakpoints established.

## Next migration sequence
1. Migrate the legacy application shell and theme behavior.
2. Migrate authentication without changing its server functions.
3. Migrate the authenticated route tree and existing feature logic.
4. Replace page-specific presentation with shared V2 primitives one route at a time.
5. Migrate rental components and assets.
6. Migrate PWA assets and public imagery.
7. Run a route-by-route visual and functional QA pass.

Never copy `.env` or secrets into V2. Environment values must remain deployment configuration.
