# Appearance System — Design Spec

## Goal

Replace the single bundled "motif" preset with three independent appearance dimensions that users can mix and match:

- **Color** — the overall accent palette
- **Font** — the typeface / format feel
- **Borders** — the global border radius

This gives users more control while preserving the existing light/dark mode behavior and CSS-variable-driven styling.

## Scope

**In scope:**

- Landing page (`/` route and `LandingHeader`)
- Client dashboard (`/dashboard/*` routes, `DashboardLayout`)
- Appearance state, persistence, and CSS-variable application
- Migration from the legacy single `motif` key

**Out of scope:**

- Back-office appearance customization
- Widget appearance (widget has its own settings)
- Backend persistence of appearance preferences
- Per-user account-level appearance sync

## State Model & Storage

Replace the single `motif` key with four keys in `localStorage`:

| Dimension | Key | Type | Default |
|-----------|-----|------|---------|
| Color | `pagepal:color` | `ColorId` | `"green"` |
| Font | `pagepal:font` | `FontId` | `"inter"` |
| Radius | `pagepal:radius` | `RadiusId` | `"slight"` |
| Custom color | `pagepal:custom-color` | `hex` | `"#16a34a"` |

The three main dimensions are independent; the custom color is used when `color` is set to `"custom"`.

A single `useAppearance()` hook in `apps/web/src/lib/useAppearance.ts` reads/writes all three dimensions and applies CSS variables.

### Legacy migration

On first load, if `motif` still exists in `localStorage`, map it to the three new defaults and remove the old key:

| Legacy motif | Color | Font | Radius |
|--------------|-------|------|--------|
| `forest` | `green` | `inter` | `slight` |
| `sunset` | `orange` | `source-sans` | `round` |
| `ocean` | `blue` | `manrope` | `slight` |
| `berry` | `purple` | `nunito` | `round` |

The radius mapping is an approximation because the new named options do not include the legacy `0.5rem` value. Forest's old `0.5rem` becomes `slight` (`0.375rem`) — close enough for a one-time migration.

## CSS Architecture

Move from bundled `[data-motif="..."]` blocks to independent data attributes:

```css
[data-color="green"] { /* full palette */ }
[data-color="gold"] { /* full palette */ }
/* etc. */

[data-font="inter"] { --font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
[data-font="playfair"] { --font-family: "Playfair Display", Georgia, serif; }
/* etc. */

[data-radius="sharp"] { --radius-value: 0rem; }
[data-radius="slight"] { --radius-value: 0.375rem; }
[data-radius="round"] { --radius-value: 0.75rem; }
[data-radius="pill"] { --radius-value: 1.5rem; }
```

The `@theme` block maps every Tailwind v4 radius utility variable (`--radius-sm`, `--radius-md`, `--radius-lg`, etc.) to the runtime `--radius-value` so that `rounded-md`, `rounded-xl`, and shadcn components all react to the border-radius preset.

On mount, the hook sets `data-color`, `data-font`, and `data-radius` on `<html>`. Each dimension can be changed independently.

A synchronous inline script in `index.html` reads the three keys and applies the attributes before React mounts to prevent flashes.

Each color theme defines the same set of CSS variables as the previous motif system (background, foreground, primary, secondary, muted, accent, destructive, border, input, ring, chart-1..5, plus landing page use-case tokens).

## Color Themes

Ten plain-named palettes, each with light and dark variants:

| ColorId | Light primary | Dark primary | Description |
|---------|---------------|--------------|-------------|
| `green` | `#16a34a` | `#22c55e` | Existing forest identity |
| `orange` | `#f97316` | `#fb923c` | Existing sunset warmth |
| `blue` | `#2563eb` | `#3b82f6` | Existing ocean corporate blue |
| `purple` | `#9333ea` | `#a855f7` | Existing berry playful purple |
| `gold` | `#d97706` | `#f59e0b` | Gold / amber as requested |
| `royal-blue` | `#1d4ed8` | `#2563eb` | Deep royal blue as requested |
| `cyan` | `#0891b2` | `#22d3ee` | Sci-fi light blue as requested |
| `emerald` | `#059669` | `#10b981` | Second green variant as requested |
| `pink` | `#db2777` | `#f472b6` | Rose / pink |
| `slate` | `#475569` | `#94a3b8` | Neutral professional gray |

A special `custom` palette is generated at runtime from a user-selected hex color. The hook converts the hex to HSL, derives primary, secondary, muted, accent, border, ring, and chart tokens, and switches to a darker variant when the page is in dark mode.

Each palette is hand-tuned for contrast in both light and dark modes.

## Font Options

Seven typefaces spanning different personalities:

| FontId | Font | Fallback | Personality |
|--------|------|----------|-------------|
| `inter` | Inter | system-ui | Neutral default |
| `source-sans` | Source Sans 3 | Inter, system-ui | Clean UI |
| `manrope` | Manrope | Inter, system-ui | Modern geometric |
| `nunito` | Nunito | Inter, system-ui | Rounded friendly |
| `merriweather` | Merriweather | Georgia, serif | Traditional serif |
| `jetbrains-mono` | JetBrains Mono | ui-monospace, monospace | Tech / developer |
| `playfair` | Playfair Display | Georgia, serif | Elegant display |

Google Fonts are loaded once in `apps/web/index.html` with weights 400, 500, 600, 700:

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Merriweather:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet">
```

## Border Radius Options

Four named levels:

| RadiusId | Value | Feel |
|----------|-------|------|
| `sharp` | `0rem` | Brutalist, dense |
| `slight` | `0.375rem` | Subtle, default |
| `round` | `0.75rem` | Friendly, card-like |
| `pill` | `1.5rem` | Very rounded |

The `--radius` token is consumed by shadcn/ui components and Tailwind utilities.

## Custom Color

In addition to the named palettes, the color section includes a **custom color swatch** that opens the browser's native `<input type="color">` picker.

The custom color is stored as `pagepal:custom-color` (default `"#16a34a"`). When the user picks a color, the hook sets the active `color` to `"custom"` and generates a full palette from the hex value in JavaScript. The generator converts the hex to HSL, derives primary, secondary, muted, accent, border, ring, and chart tokens, and produces a darker variant when the page is in dark mode.

## UI Component

Replace `MotifSwitcher` with `AppearanceMenu`.

- **Trigger:** A single button in `LandingHeader` and `DashboardLayout` sidebar footer (same placements as today), showing a palette icon and a small preview of the active color.
- **Popover content:** Stacked sections with clear headings:
  1. **Colors** — grid of 10 preset swatches + a custom color swatch that opens the native color picker
  2. **Fonts** — grid of font previews showing the font name in its own face
  3. **Borders** — row of 4 shape previews showing increasing roundness
- Each option is clickable and shows a checkmark when active.
- Uses the existing shadcn `Popover` and `Button` primitives.

## File Structure

**Add:**

- `apps/web/src/lib/appearance.ts` — constants, types, and data for colors, fonts, radii
- `apps/web/src/lib/useAppearance.ts` — hook for state, persistence, and CSS application
- `apps/web/src/components/common/AppearanceMenu.tsx` — new appearance popover

**Modify:**

- `apps/web/src/lib/motifs.ts` — deprecate; keep exports for migration reference, remove from active UI
- `apps/web/src/lib/useMotif.ts` — deprecate; keep for migration reference
- `apps/web/src/components/common/MotifSwitcher.tsx` — replace with `AppearanceMenu`
- `apps/web/src/index.css` — replace motif blocks with independent `[data-color]`, `[data-font]`, `[data-radius]` blocks
- `apps/web/index.html` — update preload script for three keys; add new Google Fonts link
- `apps/web/src/lib/constants.ts` — add `STORAGE_KEYS.COLOR`, `STORAGE_KEYS.FONT`, `STORAGE_KEYS.RADIUS`, `STORAGE_KEYS.CUSTOM_COLOR`
- `apps/web/public/locales/{en,cs,zh}/translation.json` — add appearance labels (color, font, radius names + section titles)
- `apps/web/src/components/landing/LandingHeader.tsx` — swap `MotifSwitcher` for `AppearanceMenu`
- `apps/web/src/components/layout/DashboardLayout.tsx` — swap `MotifSwitcher` for `AppearanceMenu`

**Remove (after migration):**

- Legacy `STORAGE_KEYS.MOTIF` and `DEFAULTS.MOTIF` once migration has been in place for a release cycle.

## i18n

All user-facing strings must be added to `en`, `cs`, and `zh` locale files:

- Section titles: `appearance.title`, `appearance.colors`, `appearance.fonts`, `appearance.borders`
- Color names: `appearance.color.green`, `appearance.color.orange`, etc.
- Font names: `appearance.font.inter`, `appearance.font.source-sans`, etc.
- Radius names: `appearance.radius.sharp`, `appearance.radius.slight`, etc.
- Custom color label: `appearance.color.custom`, `appearance.customColor`

## Verification

- Switch each color and confirm light/dark variants render correctly across landing and dashboard.
- Switch fonts and confirm the body text updates without layout shift.
- Switch border radius and confirm buttons, cards, inputs, and badges update.
- Pick a custom color and confirm the active palette updates in both light and dark modes.
- Reload the page; confirm no flash of defaults.
- Simulate a legacy `motif` value in `localStorage`; confirm it migrates to the three new keys.
- Resize to mobile width; confirm the trigger and popover remain usable.
- Run `bun run fix`, `bun run type-check`, and `bun run build` for `apps/web`.

## Open Questions / Future Work

- Should we expose this appearance menu in the back-office? Out of scope for now.
- Should per-user appearance preferences be persisted to the backend? Out of scope for now.
- Should we add a "reset to default" action in the popover? Desirable but can be added later.
