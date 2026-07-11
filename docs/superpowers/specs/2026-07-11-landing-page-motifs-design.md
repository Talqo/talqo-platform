# Landing Page Motif System — Design Spec

## Goal

Add a motif switcher to the landing page that lets users (and internal stakeholders) instantly swap between multiple visual personalities. Each motif changes colors, border radius, and subtle typography/icon feel while keeping all components and page structure identical. Inspired by n8n’s token-based design system.

## Scope

- **In scope:** Landing page (`/` route and `LandingHeader`) and the client dashboard (`/dashboard/*` routes, `DashboardLayout`, and all settings pages).
- **Out of scope:** Back-office, widget, backend persistence, new pages or components.

## Motifs

| Motif | Primary | Personality | Radius | Font |
|-------|---------|-------------|--------|------|
| **Forest** | Green (`#16a34a` light, `#22c55e` dark) | Current identity. Fresh, trustworthy, SaaS. | `0.5rem` | Inter / system |
| **Sunset** | Orange (`#f97316` light, `#fb923c` dark) | Warm, energetic, n8n-inspired. | `0.75rem` | Source Sans 3 |
| **Ocean** | Blue (`#2563eb` light, `#3b82f6` dark) | Corporate, precise, technical. | `0.375rem` | Manrope |
| **Berry** | Purple (`#9333ea` light, `#a855f7` dark) | Playful, modern, app-like. | `0.75rem` (pill-friendly) | Nunito |

### Full Token Sets

#### Forest

```css
:root, [data-motif="forest"] {
  --background: #ffffff;
  --foreground: #09090b;
  --card: #ffffff;
  --card-foreground: #09090b;
  --popover: #ffffff;
  --popover-foreground: #09090b;
  --primary: #16a34a;
  --primary-foreground: #ffffff;
  --secondary: #f0fdf4;
  --secondary-foreground: #166534;
  --muted: #f4f4f5;
  --muted-foreground: #71717a;
  --accent: #f0fdf4;
  --accent-foreground: #166534;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #e4e4e7;
  --input: #e4e4e7;
  --ring: #16a34a;
  --chart-1: #16a34a;
  --chart-2: #22c55e;
  --chart-3: #4ade80;
  --chart-4: #86efac;
  --chart-5: #bbf7d0;
  --radius: 0.5rem;
  --font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.dark, [data-motif="forest"].dark {
  --background: #09090b;
  --foreground: #fafafa;
  --card: #18181b;
  --card-foreground: #fafafa;
  --popover: #18181b;
  --popover-foreground: #fafafa;
  --primary: #22c55e;
  --primary-foreground: #052e16;
  --secondary: #27272a;
  --secondary-foreground: #fafafa;
  --muted: #27272a;
  --muted-foreground: #a1a1aa;
  --accent: #27272a;
  --accent-foreground: #fafafa;
  --destructive: #7f1d1d;
  --destructive-foreground: #fecaca;
  --border: #27272a;
  --input: #27272a;
  --ring: #22c55e;
  --chart-1: #22c55e;
  --chart-2: #4ade80;
  --chart-3: #86efac;
  --chart-4: #bbf7d0;
  --chart-5: #dcfce7;
}
```

#### Sunset

```css
[data-motif="sunset"] {
  --background: #ffffff;
  --foreground: #1c1917;
  --card: #ffffff;
  --card-foreground: #1c1917;
  --popover: #ffffff;
  --popover-foreground: #1c1917;
  --primary: #f97316;
  --primary-foreground: #ffffff;
  --secondary: #fff7ed;
  --secondary-foreground: #9a3412;
  --muted: #fafaf9;
  --muted-foreground: #78716c;
  --accent: #fff7ed;
  --accent-foreground: #9a3412;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #fed7aa;
  --input: #fed7aa;
  --ring: #f97316;
  --chart-1: #f97316;
  --chart-2: #fb923c;
  --chart-3: #fdba74;
  --chart-4: #fed7aa;
  --chart-5: #ffedd5;
  --radius: 0.75rem;
  --font-family: "Source Sans 3", Inter, ui-sans-serif, system-ui, sans-serif;
}

[data-motif="sunset"].dark {
  --background: #0c0a09;
  --foreground: #fafaf9;
  --card: #1c1917;
  --card-foreground: #fafaf9;
  --popover: #1c1917;
  --popover-foreground: #fafaf9;
  --primary: #fb923c;
  --primary-foreground: #431407;
  --secondary: #292524;
  --secondary-foreground: #fafaf9;
  --muted: #292524;
  --muted-foreground: #a8a29e;
  --accent: #292524;
  --accent-foreground: #fafaf9;
  --destructive: #7f1d1d;
  --destructive-foreground: #fecaca;
  --border: #44403c;
  --input: #44403c;
  --ring: #fb923c;
  --chart-1: #fb923c;
  --chart-2: #fdba74;
  --chart-3: #fed7aa;
  --chart-4: #ffedd5;
  --chart-5: #fff7ed;
}
```

#### Ocean

```css
[data-motif="ocean"] {
  --background: #ffffff;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --popover: #ffffff;
  --popover-foreground: #0f172a;
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --secondary: #eff6ff;
  --secondary-foreground: #1e40af;
  --muted: #f8fafc;
  --muted-foreground: #64748b;
  --accent: #eff6ff;
  --accent-foreground: #1e40af;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #bfdbfe;
  --input: #bfdbfe;
  --ring: #2563eb;
  --chart-1: #2563eb;
  --chart-2: #3b82f6;
  --chart-3: #60a5fa;
  --chart-4: #93c5fd;
  --chart-5: #dbeafe;
  --radius: 0.375rem;
  --font-family: Manrope, Inter, ui-sans-serif, system-ui, sans-serif;
}

[data-motif="ocean"].dark {
  --background: #020617;
  --foreground: #f8fafc;
  --card: #0f172a;
  --card-foreground: #f8fafc;
  --popover: #0f172a;
  --popover-foreground: #f8fafc;
  --primary: #3b82f6;
  --primary-foreground: #eff6ff;
  --secondary: #1e293b;
  --secondary-foreground: #f8fafc;
  --muted: #1e293b;
  --muted-foreground: #94a3b8;
  --accent: #1e293b;
  --accent-foreground: #f8fafc;
  --destructive: #7f1d1d;
  --destructive-foreground: #fecaca;
  --border: #1e293b;
  --input: #1e293b;
  --ring: #3b82f6;
  --chart-1: #3b82f6;
  --chart-2: #60a5fa;
  --chart-3: #93c5fd;
  --chart-4: #dbeafe;
  --chart-5: #eff6ff;
}
```

#### Berry

```css
[data-motif="berry"] {
  --background: #ffffff;
  --foreground: #1e1b4b;
  --card: #ffffff;
  --card-foreground: #1e1b4b;
  --popover: #ffffff;
  --popover-foreground: #1e1b4b;
  --primary: #9333ea;
  --primary-foreground: #ffffff;
  --secondary: #faf5ff;
  --secondary-foreground: #6b21a8;
  --muted: #fafafa;
  --muted-foreground: #737373;
  --accent: #faf5ff;
  --accent-foreground: #6b21a8;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: #e9d5ff;
  --input: #e9d5ff;
  --ring: #9333ea;
  --chart-1: #9333ea;
  --chart-2: #a855f7;
  --chart-3: #c084fc;
  --chart-4: #d8b4fe;
  --chart-5: #f3e8ff;
  --radius: 0.75rem;
  --font-family: Nunito, Inter, ui-sans-serif, system-ui, sans-serif;
}

[data-motif="berry"].dark {
  --background: #0a071b;
  --foreground: #fafafa;
  --card: #1e1b4b;
  --card-foreground: #fafafa;
  --popover: #1e1b4b;
  --popover-foreground: #fafafa;
  --primary: #a855f7;
  --primary-foreground: #f3e8ff;
  --secondary: #2e1065;
  --secondary-foreground: #fafafa;
  --muted: #2e1065;
  --muted-foreground: #a3a3a3;
  --accent: #2e1065;
  --accent-foreground: #fafafa;
  --destructive: #7f1d1d;
  --destructive-foreground: #fecaca;
  --border: #4c1d95;
  --input: #4c1d95;
  --ring: #a855f7;
  --chart-1: #a855f7;
  --chart-2: #c084fc;
  --chart-3: #d8b4fe;
  --chart-4: #f3e8ff;
  --chart-5: #faf5ff;
}
```

## Typography & Font Loading

Each motif uses a distinct typeface to reinforce its personality:

| Motif | Font | Fallback |
|-------|------|----------|
| Forest | Inter | system-ui |
| Sunset | Source Sans 3 | Inter, system-ui |
| Ocean | Manrope | Inter, system-ui |
| Berry | Nunito | Inter, system-ui |

Google Fonts are loaded once in `apps/web/index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet">
```

The `--font-family` token is applied to `body` via `font-family: var(--font-family)` in `src/index.css`. If a user has slow or offline loading, the Inter/system fallback renders immediately.

## Architecture

- The HTML root element carries two independent attributes:
  - `data-motif="forest|sunset|ocean|berry"` for the color/radius/font personality.
  - `class="dark"` for light/dark mode.
- All existing shadcn/ui components already read CSS variables such as `--primary`, `--background`, `--ring`, `--radius`, etc. No component code changes.
- The `@theme` block in `src/index.css` maps Tailwind theme keys to the CSS variables, so Tailwind utilities like `bg-primary` and `rounded-lg` continue to work.

## State & Persistence

- New hook: `useMotif()` in `apps/web/src/lib/useMotif.ts`.
  - Reads `localStorage.getItem(STORAGE_KEYS.MOTIF)` on mount.
  - Falls back to `"forest"`.
  - Writes back to `localStorage` and dispatches a `motif-change` event so multiple consumers stay in sync.
- Storage key added to `apps/web/src/lib/constants.ts`.
- To prevent a flash of the default motif on reload, a small inline script runs synchronously in `apps/web/index.html` before React mounts.

```html
<script>
  (function () {
    const motif = localStorage.getItem('motif') || 'forest'
    const theme = localStorage.getItem('theme') || 'light'
    document.documentElement.setAttribute('data-motif', motif)
    if (theme === 'dark') document.documentElement.classList.add('dark')
  })()
</script>
```

## Switcher UI

- Component: `MotifSwitcher`.
- Placement:
  - `LandingHeader`: to the right of the language switcher and dark/light toggle.
  - `DashboardLayout` sidebar footer: above or below the existing dark/light toggle.
- Interaction: dropdown button showing active motif name + small colored dot.
- Menu items show motif name + color dot.
- Uses the existing shadcn `DropdownMenu` primitive.

## File Structure

**Add:**
- `apps/web/src/lib/motifs.ts`
- `apps/web/src/lib/useMotif.ts`
- `apps/web/src/components/common/MotifSwitcher.tsx`

**Modify:**
- `apps/web/src/index.css` — append motif variable blocks and apply `font-family: var(--font-family)` to `body`.
- `apps/web/index.html` — add preload script and Google Fonts link in `<head>`.
- `apps/web/src/components/landing/LandingHeader.tsx` — add `<MotifSwitcher />`.
- `apps/web/src/components/layout/DashboardLayout.tsx` — add `<MotifSwitcher />` to the sidebar footer near the theme toggle.
- `apps/web/src/lib/constants.ts` — add `STORAGE_KEYS.MOTIF`.
- `apps/web/public/locales/{en,cs,zh}/translation.json` — add motif labels.

**Unchanged:**
- Back-office layout, widget, API, DB schema.

## Verification

- Manually switch motifs on the landing page; confirm colors and radius update instantly.
- Reload the page; confirm no flash of the default motif.
- Toggle dark mode inside each motif.
- Resize to mobile width; confirm header layout remains usable.
- Confirm dashboard and settings pages update when the motif is switched from the sidebar.
- Confirm back-office still renders in the original green.
- Run `bun run type-check`, `bun run fix`, and `bun run build` for `apps/web`.

## Open Questions / Future Work

- Should motifs apply to the back-office? Out of scope for this branch.
- Should the widget appearance config consume the active motif? Out of scope; widget has its own appearance settings.
- Should motif preference be stored per user on the backend? Out of scope; localStorage only for now.
