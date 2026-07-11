# Landing Page & Dashboard Motif System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a motif switcher to the landing page and client dashboard that swaps colors, border radius, and fonts while keeping all components and page structure identical.

**Architecture:** Motifs are pure CSS-variable sets scoped by `data-motif` on the root element. A `useMotif` hook reads/writes `localStorage` and dispatches sync events. A `MotifSwitcher` dropdown uses the existing shadcn `DropdownMenu`. Google Fonts are loaded once in `index.html`, and a small preload script prevents motif flash on load.

**Tech Stack:** React 19, TypeScript 6, Tailwind CSS 4, shadcn/ui, lucide-react, react-i18next, Bun.

## Global Constraints

- All work happens on branch `feat/motif-system`.
- Use Bun only — never npm/yarn/pnpm.
- Use `import type` for type-only imports (`verbatimModuleSyntax`).
- Follow Biome formatting: tabs, double quotes, no semicolons, trailing commas, line width 80.
- Reuse existing shadcn/ui primitives; do not hand-edit files in `src/components/ui/`.
- Add i18n keys to `en`, `cs`, and `zh` translation files.
- Scope: landing page (`/`) and client dashboard (`/dashboard/*`). Back-office and widget are unchanged.
- Run `bun run fix`, `bun run type-check`, and `bun run build` for `apps/web` after code changes.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/web/src/lib/constants.ts` | Adds `STORAGE_KEYS.MOTIF`. |
| `apps/web/src/lib/motifs.ts` | Exports motif metadata (id, label key, color dot). |
| `apps/web/src/lib/useMotif.ts` | Hook for reading/writing active motif with cross-tab sync. |
| `apps/web/src/components/common/MotifSwitcher.tsx` | Dropdown UI for switching motifs. |
| `apps/web/src/index.css` | Motif variable blocks + `font-family: var(--font-family)` on `body`. |
| `apps/web/index.html` | Preload script + Google Fonts link. |
| `apps/web/src/components/landing/LandingHeader.tsx` | Mounts `MotifSwitcher` in the landing header. |
| `apps/web/src/components/layout/DashboardLayout.tsx` | Mounts `MotifSwitcher` in the dashboard sidebar footer. |
| `apps/web/public/locales/{en,cs,zh}/translation.json` | Motif labels. |

---

### Task 1: Add motif constants and metadata

**Files:**
- Modify: `apps/web/src/lib/constants.ts`
- Create: `apps/web/src/lib/motifs.ts`
- Test: `bun run type-check` (apps/web)

**Interfaces:**
- Produces: `STORAGE_KEYS.MOTIF = "motif"`
- Produces: `MotifId` union type and `MOTIFS` array exported from `apps/web/src/lib/motifs.ts`.

- [ ] **Step 1: Add `MOTIF` key to constants**

In `apps/web/src/lib/constants.ts`, add `MOTIF` to the existing `STORAGE_KEYS` object:

```typescript
export const STORAGE_KEYS = {
	THEME: "theme",
	MOTIF: "motif",
	TOKEN: "token",
	ADMIN_TOKEN: "admin_token",
} as const
```

Exact insertion point: after `THEME: "theme",` and before `TOKEN: "token",`.

- [ ] **Step 2: Create motif metadata file**

Create `apps/web/src/lib/motifs.ts`:

```typescript
export type MotifId = "forest" | "sunset" | "ocean" | "berry"

export interface Motif {
	id: MotifId
	labelKey: string
	dotClass: string
}

export const MOTIFS: Motif[] = [
	{
		id: "forest",
		labelKey: "motifs.forest",
		dotClass: "bg-green-600",
	},
	{
		id: "sunset",
		labelKey: "motifs.sunset",
		dotClass: "bg-orange-500",
	},
	{
		id: "ocean",
		labelKey: "motifs.ocean",
		dotClass: "bg-blue-600",
	},
	{
		id: "berry",
		labelKey: "motifs.berry",
		dotClass: "bg-purple-600",
	},
]

export const DEFAULT_MOTIF: MotifId = "forest"
```

- [ ] **Step 3: Run type-check**

Run:

```bash
cd /workspaces/pb138/apps/web && bun run type-check
```

Expected: command exits with code 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/constants.ts apps/web/src/lib/motifs.ts
git commit -m "feat(themes): add motif constants and metadata"
```

---

### Task 2: Create the useMotif hook

**Files:**
- Create: `apps/web/src/lib/useMotif.ts`
- Modify: `apps/web/src/lib/constants.ts` (already changed in Task 1)
- Test: `bun run type-check` (apps/web)

**Interfaces:**
- Consumes: `STORAGE_KEYS.MOTIF`, `DEFAULT_MOTIF`, `MotifId`, `MOTIFS`.
- Produces: `useMotif()` returns `{ motif: MotifId, setMotif: (id: MotifId) => void }`.

- [ ] **Step 1: Write the hook**

Create `apps/web/src/lib/useMotif.ts`:

```typescript
import { useEffect, useState } from "react"
import { DEFAULT_MOTIF, type MotifId, MOTIFS } from "@/lib/motifs"
import { STORAGE_KEYS } from "@/lib/constants"

export type { MotifId }

function readStoredMotif(): MotifId {
	if (typeof window === "undefined") return DEFAULT_MOTIF
	const stored = localStorage.getItem(STORAGE_KEYS.MOTIF)
	const valid = MOTIFS.find((m) => m.id === stored)
	return valid ? valid.id : DEFAULT_MOTIF
}

function applyMotif(id: MotifId) {
	if (typeof window === "undefined") return
	document.documentElement.setAttribute("data-motif", id)
}

export function useMotif() {
	const [motif, setMotifState] = useState<MotifId>(() => readStoredMotif())

	const setMotif = (id: MotifId) => {
		setMotifState(id)
		localStorage.setItem(STORAGE_KEYS.MOTIF, id)
		applyMotif(id)
		document.dispatchEvent(new CustomEvent("motif-change", { detail: id }))
	}

	useEffect(() => {
		applyMotif(motif)
	}, [motif])

	useEffect(() => {
		const handleStorage = (event: StorageEvent) => {
			if (event.key === STORAGE_KEYS.MOTIF && event.newValue) {
				const valid = MOTIFS.find((m) => m.id === event.newValue)
				if (valid) setMotifState(valid.id)
			}
		}

		const handleMotifChange = (event: Event) => {
			const custom = event as CustomEvent<MotifId>
			if (custom.detail) setMotifState(custom.detail)
		}

		window.addEventListener("storage", handleStorage)
		document.addEventListener("motif-change", handleMotifChange)

		return () => {
			window.removeEventListener("storage", handleStorage)
			document.removeEventListener("motif-change", handleMotifChange)
		}
	}, [])

	return { motif, setMotif }
}
```

- [ ] **Step 2: Run type-check**

```bash
cd /workspaces/pb138/apps/web && bun run type-check
```

Expected: command exits with code 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/useMotif.ts
git commit -m "feat(themes): add useMotif hook with localStorage sync"
```

---

### Task 3: Update CSS with motif variable blocks and font application

**Files:**
- Modify: `apps/web/src/index.css`
- Test: visual check of landing page after later tasks; `bun run build` at end.

**Interfaces:**
- Consumes: existing Tailwind `@theme` block and `body` rules.
- Produces: four complete motif variable blocks + `font-family: var(--font-family)` on `body`.

- [ ] **Step 1: Apply font-family to body**

In `apps/web/src/index.css`, locate the `body` rule inside `@layer base`:

```css
body {
	background-color: var(--background);
	color: var(--foreground);
}
```

Change it to:

```css
body {
	background-color: var(--background);
	color: var(--foreground);
	font-family: var(--font-family);
}
```

- [ ] **Step 2: Append motif variable blocks**

Append the following CSS to the end of `apps/web/src/index.css`, after the dark scrollbar rules:

```css
/* === Motifs === */

/* Forest (default) */
:root,
[data-motif="forest"] {
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

.dark,
[data-motif="forest"].dark {
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

/* Sunset */
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

/* Ocean */
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

/* Berry */
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

- [ ] **Step 3: Run Biome fix**

```bash
cd /workspaces/pb138/apps/web && bun run fix
```

Expected: command exits with code 0. Any formatting-only changes are applied.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/index.css
git commit -m "feat(themes): add forest, sunset, ocean, and berry motif tokens"
```

---

### Task 4: Update index.html with preload script and Google Fonts

**Files:**
- Modify: `apps/web/index.html`
- Test: reload landing page and verify no motif flash; `bun run build` at end.

**Interfaces:**
- Produces: synchronous motif/theme restoration before React hydration.

- [ ] **Step 1: Add Google Fonts link and preload script**

In `apps/web/index.html`, inside `<head>` and before any `<script>` tags, add:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Nunito:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet">
<script>
	(function () {
		try {
			const motif = localStorage.getItem("motif") || "forest"
			const theme = localStorage.getItem("theme") || "light"
			document.documentElement.setAttribute("data-motif", motif)
			if (theme === "dark") document.documentElement.classList.add("dark")
		} catch {
			document.documentElement.setAttribute("data-motif", "forest")
		}
	})()
</script>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/index.html
git commit -m "feat(themes): preload motif and theme before hydration, load fonts"
```

---

### Task 5: Create the MotifSwitcher component

**Files:**
- Create: `apps/web/src/components/common/MotifSwitcher.tsx`
- Test: `bun run type-check` (apps/web)

**Interfaces:**
- Consumes: `useMotif`, `MOTIFS`, `Motif` from `@/lib/motifs`.
- Produces: `<MotifSwitcher />` React component.

- [ ] **Step 1: Write the component**

Create `apps/web/src/components/common/MotifSwitcher.tsx`:

```typescript
import { useTranslation } from "react-i18next"
import { Check, Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MOTIFS } from "@/lib/motifs"
import { useMotif } from "@/lib/useMotif"
import { cn } from "@/lib/utils"

export function MotifSwitcher() {
	const { t } = useTranslation()
	const { motif: activeMotif, setMotif } = useMotif()
	const active = MOTIFS.find((m) => m.id === activeMotif) ?? MOTIFS[0]

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="gap-2">
					<Palette className="h-4 w-4" />
					<span
						className={cn(
							"h-2.5 w-2.5 rounded-full",
							active.dotClass,
						)}
					/>
					<span className="hidden sm:inline">
						{t(active.labelKey)}
					</span>
					<span className="sr-only">{t("motifs.switch")}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{MOTIFS.map((motif) => (
					<DropdownMenuItem
						key={motif.id}
						onClick={() => setMotif(motif.id)}
						className="flex items-center justify-between gap-4"
					>
						<span className="flex items-center gap-2">
							<span
								className={cn(
									"h-2.5 w-2.5 rounded-full",
									motif.dotClass,
								)}
							/>
							{t(motif.labelKey)}
						</span>
						{motif.id === activeMotif && (
							<Check className="h-4 w-4" />
						)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
```

- [ ] **Step 2: Run type-check**

```bash
cd /workspaces/pb138/apps/web && bun run type-check
```

Expected: command exits with code 0.

- [ ] **Step 3: Run Biome fix**

```bash
cd /workspaces/pb138/apps/web && bun run fix
```

Expected: command exits with code 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/common/MotifSwitcher.tsx
git commit -m "feat(themes): add motif switcher dropdown component"
```

---

### Task 6: Add MotifSwitcher to LandingHeader

**Files:**
- Modify: `apps/web/src/components/landing/LandingHeader.tsx`
- Test: verify switcher appears in landing page header and changes motif.

**Interfaces:**
- Consumes: `<MotifSwitcher />`.

- [ ] **Step 1: Import and mount the switcher**

In `apps/web/src/components/landing/LandingHeader.tsx`, add the import:

```typescript
import { MotifSwitcher } from "@/components/common/MotifSwitcher"
```

Then add `<MotifSwitcher />` to the header actions, next to the dark/light toggle. The current header renders a flex container with the theme toggle. Insert the motif switcher immediately before or after the existing theme button.

The exact JSX change depends on the current file, but the target area is the header actions flex. For example, if the current code is:

```tsx
<Button variant="ghost" size="icon" onClick={toggleTheme}>
  {theme === "dark" ? <Sun /> : <Moon />}
</Button>
```

Change it to:

```tsx
<MotifSwitcher />
<Button variant="ghost" size="icon" onClick={toggleTheme}>
  {theme === "dark" ? <Sun /> : <Moon />}
</Button>
```

- [ ] **Step 2: Run type-check and fix**

```bash
cd /workspaces/pb138/apps/web && bun run type-check && bun run fix
```

Expected: both commands exit with code 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/landing/LandingHeader.tsx
git commit -m "feat(themes): add motif switcher to landing header"
```

---

### Task 7: Add MotifSwitcher to DashboardLayout sidebar

**Files:**
- Modify: `apps/web/src/components/layout/DashboardLayout.tsx`
- Test: verify switcher appears in dashboard sidebar and changes motif across dashboard pages.

**Interfaces:**
- Consumes: `<MotifSwitcher />`.

- [ ] **Step 1: Import and mount the switcher**

In `apps/web/src/components/layout/DashboardLayout.tsx`, add the import:

```typescript
import { MotifSwitcher } from "@/components/common/MotifSwitcher"
```

Locate the sidebar footer that already contains the theme toggle button. Insert `<MotifSwitcher />` immediately before the theme toggle button. The footer is inside:

```tsx
<div className="mt-auto border-border border-t bg-card p-4">
  {/* existing theme toggle */}
</div>
```

Change it to:

```tsx
<div className="mt-auto border-border border-t bg-card p-4">
  <MotifSwitcher />
  <Button
    variant="ghost"
    size="sm"
    onClick={toggleTheme}
    className="mb-2 w-full justify-start"
  >
    {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    <span className="ml-2">
      {theme === "dark"
        ? t("clientDashboard.nav.lightMode")
        : t("clientDashboard.nav.darkMode")}
    </span>
  </Button>
  {/* logout button */}
</div>
```

Note: `MotifSwitcher` uses `size="sm"` and `variant="ghost"` internally, but the parent `DropdownMenuTrigger` renders a `Button`. It is not a full-width sidebar item by default; wrap it if a full-width style is desired:

```tsx
<div className="mb-2 w-full">
  <MotifSwitcher />
</div>
```

Use whichever layout looks better after visual inspection.

- [ ] **Step 2: Run type-check and fix**

```bash
cd /workspaces/pb138/apps/web && bun run type-check && bun run fix
```

Expected: both commands exit with code 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/DashboardLayout.tsx
git commit -m "feat(themes): add motif switcher to dashboard sidebar"
```

---

### Task 8: Add i18n labels

**Files:**
- Modify: `apps/web/public/locales/en/translation.json`
- Modify: `apps/web/public/locales/cs/translation.json`
- Modify: `apps/web/public/locales/zh/translation.json`
- Test: `bun run type-check` and manual UI check.

**Interfaces:**
- Produces: translation keys `motifs.forest`, `motifs.sunset`, `motifs.ocean`, `motifs.berry`, `motifs.switch`.

- [ ] **Step 1: Add English labels**

In `apps/web/public/locales/en/translation.json`, add a top-level `motifs` object near other feature namespaces:

```json
"motifs": {
	"forest": "Forest",
	"sunset": "Sunset",
	"ocean": "Ocean",
	"berry": "Berry",
	"switch": "Switch motif"
}
```

- [ ] **Step 2: Add Czech labels**

In `apps/web/public/locales/cs/translation.json`:

```json
"motifs": {
	"forest": "Les",
	"sunset": "Západ slunce",
	"ocean": "Oceán",
	"berry": "Bobule",
	"switch": "Přepnout motiv"
}
```

- [ ] **Step 3: Add Chinese labels**

In `apps/web/public/locales/zh/translation.json`:

```json
"motifs": {
	"forest": "森林",
	"sunset": "日落",
	"ocean": "海洋",
	"berry": "浆果",
	"switch": "切换主题"
}
```

- [ ] **Step 4: Run type-check**

```bash
cd /workspaces/pb138/apps/web && bun run type-check
```

Expected: command exits with code 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/public/locales/en/translation.json apps/web/public/locales/cs/translation.json apps/web/public/locales/zh/translation.json
git commit -m "feat(i18n): add motif labels"
```

---

### Task 9: Verify build, formatting, and manual behavior

**Files:**
- All files changed above.

- [ ] **Step 1: Run formatter and type-check**

```bash
cd /workspaces/pb138/apps/web && bun run fix && bun run type-check
```

Expected: both exit with code 0.

- [ ] **Step 2: Build the web app**

```bash
cd /workspaces/pb138/apps/web && bun run build
```

Expected: build completes and `dist/` is produced.

- [ ] **Step 3: Manual verification checklist**

Run the dev server (`cd /workspaces/pb138/apps/web && bun run dev`) and check:

1. Landing page loads with Forest colors by default.
2. Open the motif switcher in the landing header; select Sunset → primary color turns orange, radius softens, font changes to Source Sans 3.
3. Select Ocean → primary turns blue, radius sharpens, font changes to Manrope.
4. Select Berry → primary turns purple, radius stays soft, font changes to Nunito.
5. Toggle dark mode in each motif; dark palette updates correctly.
6. Reload the page; the selected motif and dark mode restore instantly with no flash.
7. Log in and open the dashboard; the sidebar shows the motif switcher.
8. Change motif from the dashboard sidebar; all dashboard pages update.
9. Open dashboard settings pages; they respect the active motif.
10. Back-office remains the original green.
11. Mobile header/sidebar layout remains usable.

- [ ] **Step 4: Final commit**

If any fixes were needed during verification:

```bash
git add -A
git commit -m "fix(themes): address verification findings"
```

If no fixes were needed, there is nothing to commit in this task.

---

## Self-Review Checklist

- [ ] Spec coverage: every motif has light/dark tokens, fonts, radius, and switcher placement.
- [ ] No placeholders: every step has exact file paths, code, and commands.
- [ ] Type consistency: `MotifId` union matches ids used in `MOTIFS` and `useMotif`.
- [ ] i18n: labels added to all three locale files.
- [ ] No hand-edited shadcn/ui files.
