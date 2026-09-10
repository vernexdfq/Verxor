# Verxor Design System

**Status:** Locked foundation — September 2026

Verxor uses a calm, product-led light interface with an intentional dark theme. The visual goal is premium SaaS/fintech quality: clear hierarchy, restrained surfaces, strong typography, excellent mobile ergonomics, and no template-like visual noise.

## 1. Brand color tokens

| Token | Value | Purpose |
|---|---|---|
| `--primary` | `#2563EB` | Primary actions, active states, links |
| `--primary-hover` | `#1D4ED8` | Hover/pressed primary actions |
| `--primary-soft` | `#EFF6FF` | Selected surfaces, badges, subtle emphasis |
| `--primary-soft-strong` | `#DBEAFE` | Stronger selected/background state |
| `--text` | `#0F172A` | Headings and primary text |
| `--text-secondary` | `#1E293B` | Secondary headings/body emphasis |
| `--muted` | `#64748B` | Descriptions and supporting text |
| `--background` | `#F8FAFC` | Application/page background |
| `--surface` | `#FFFFFF` | Cards, dialogs, inputs |
| `--border` | `#E2E8F0` | Borders and dividers |
| `--success` | `#22C55E` | Ready/success states |
| `--gradient` | `#2563EB → #4F46E5` | Optional hero emphasis only |

Color is semantic. Do not introduce one-off blues, purples, gradients, or shadows for individual pages.

## 2. Typography

**Primary family:** Inter. Use system fallbacks for resilience.

- Display: 32px / 38px, 700, tight tracking
- H1: 28px / 34px, 700
- H2: 20px / 28px, 700
- H3: 16px / 24px, 600
- Body: 14px / 21px, 400
- Body emphasis: 14px / 21px, 600
- Small: 12px / 18px, 500
- Caption: 11px / 16px, 500
- Eyebrow/overline: 11px / 16px, 700, 0.08em tracking

Use weight and spacing to create hierarchy; do not rely on oversized text everywhere.

## 3. Layout

- Mobile content gutter: 20px
- Compact gutter: 16px where a dense data surface needs it
- Desktop maximum content width: 1120px
- App/mobile reading rail: 448px
- Standard section gap: 32px
- Component gap: 16px
- Dense gap: 8px
- Never create horizontal overflow.

Desktop layouts may expand into two or three columns when the workflow benefits from it. Mobile collapses to one primary column.

## 4. Spacing scale

Use 4px increments: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

Avoid arbitrary values unless required by a platform-safe-area or a specific visual asset.

## 5. Geometry

- Small controls: 10px radius
- Inputs/buttons: 12px radius
- Standard cards: 16px radius
- Featured cards/dialogs: 20px radius
- Large hero surfaces: 24px radius
- Pills: 999px

Do not round every nested element. Parent and child geometry should have clear hierarchy.

## 6. Elevation

Prefer borders and surface contrast. Shadows are quiet:

- `--shadow-xs`: `0 1px 2px rgba(15, 23, 42, .04)`
- `--shadow-sm`: `0 4px 14px rgba(15, 23, 42, .05)`
- `--shadow-md`: `0 12px 30px rgba(15, 23, 42, .08)`

No glassmorphism, heavy glow, neon shadows, or decorative 3D effects in normal product UI.

## 7. Controls

### Buttons

- Primary: blue fill, white text, 44–48px height
- Secondary: white/surface with border
- Ghost: transparent, muted text
- Destructive: reserved for irreversible actions
- Disabled: reduced contrast and no hover treatment

Every button must have a visible focus state and a meaningful loading state.

### Inputs/selects

- Minimum touch height: 44px
- Clear label above the control
- Helpful description/error below where needed
- `:focus-visible` uses a blue accessible ring
- Error state never relies on color alone

## 8. Data surfaces

Tables, order lists, provider lists, number inventories, and transaction histories use the same data-row language:

- Clear column/field hierarchy
- Consistent row height
- Subtle separators
- Status badges with text
- Horizontal scrolling only when genuinely unavoidable
- Mobile converts dense tables to stacked rows/cards where appropriate

## 9. Navigation

Navigation communicates location, not decoration.

- Desktop: persistent sidebar/top navigation when the screen supports it
- Mobile: compact top bar + five-item bottom navigation for primary destinations
- Active state: primary blue + subtle primary-soft surface
- Theme toggle remains a theme control; it must not be mistaken for a navigation item.

## 10. Feedback states

Every network-backed feature must define:

1. Loading/skeleton
2. Empty
3. Success
4. Recoverable error
5. Offline/provider unavailable where relevant
6. Processing/pending where an external provider may take time

Errors explain what happened and what the user can do next. Never use fake success states.

## 11. Modal and toast rules

Dialogs are for decisions or focused tasks, not entire pages. They have clear titles, concise supporting text, and explicit actions.

Toasts are brief confirmations/errors. Important information must also exist in the page state; a toast alone is not the only record of a payment/order result.

## 12. Accessibility

- Keyboard navigation must work on desktop.
- All interactive controls need visible focus.
- Touch targets are at least 44×44px.
- Icon-only controls require accessible labels.
- Contrast must remain readable in both themes.
- Do not communicate status by color alone.
- Respect `prefers-reduced-motion`.
- Inputs must have programmatic labels.

## 13. Theme rules

Light mode is the primary visual expression. Dark mode is a complete semantic theme, not a black overlay.

Dark mode keeps the same blue identity while using dark navy surfaces and readable muted text. Do not introduce a second brand palette.

## 14. Engineering rule

Pages should compose shared primitives rather than inventing local versions of cards, buttons, inputs, badges, or spacing. Business/API logic stays separate from presentation. The old Verxor application remains the functional reference; this system governs the new interface.
