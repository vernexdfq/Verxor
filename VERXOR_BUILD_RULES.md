# Verxor V2 — Build Rules

## Source of truth
The legacy Verxor application is the reference for existing product behavior, feature inventory, copy, and brand direction. V2 must improve the presentation without inventing a different product.

## UI rules
- Mobile-first; the primary application rail is 28rem / 448px.
- Use one content gutter system across authenticated screens.
- Keep light and dark themes intentional and semantically tokenized.
- Prefer restrained surfaces, borders, typography, and spacing over decorative effects.
- Cards clip their contents and use consistent geometry.
- Long identifiers, emails, URLs, and service values must wrap safely.
- Never introduce horizontal page overflow.
- Icons come from the shared icon library; do not use emoji or text glyphs as interface icons.
- Build loading, empty, error, success, and disabled states deliberately.
- Avoid arbitrary one-off styling when a shared primitive exists.

## Engineering rules
- UI components must not contain database queries or secrets.
- API/service access belongs in service/feature modules.
- Authentication state belongs in the auth layer.
- Do not commit environment secrets.
- Do not replace working product behavior with fake placeholder functionality.
- TypeScript must remain strict.
- Every production dependency should be version-pinned rather than using `latest`.

## Quality gate
Before calling a screen complete, verify mobile widths around 360–430px, desktop behavior, light mode, dark mode, overflow, keyboard/touch behavior, loading/empty/error states, and a production build.
