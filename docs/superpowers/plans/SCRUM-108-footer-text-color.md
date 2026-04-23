# SCRUM-108: Footer Text Color Format Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the widget footer text color default from `rgba(255, 255, 255, 0.8)` to `#ffffff` for consistent hex/hsl color formatting across the theme.

**Architecture:** Single-file changes in `packages/widget`: update `DEFAULT_COLORS`, CSS fallback, JSDoc, and any test expectations.

**Tech Stack:** TypeScript, Vite, CSS custom properties

---

### Task 1: Change default color in main.tsx

**Files:**
- Modify: `packages/widget/src/main.tsx:28`

- [ ] **Step 1: Replace rgba with hex**

  ```typescript
  footerText: "#ffffff",
  ```

- [ ] **Step 2: Verify dark mode generation**

  Confirm `resolveDarkColors` (line 69) passes `footerText` through unchanged — no change needed since dark mode already inherits light `footerText`.

- [ ] **Step 3: Commit**

  ```bash
  git add packages/widget/src/main.tsx
  git commit -m "fix(widget): use hex color for footer text default"
  ```

### Task 2: Update CSS fallback

**Files:**
- Modify: `packages/widget/src/theme/default.css:182`, `474`, `484`

- [ ] **Step 1: Replace rgba fallback with hex**

  Search & replace all occurrences of:
  `rgba(255, 255, 255, 0.8)` → `#ffffff`
  within `default.css`.

- [ ] **Step 2: Update JSDoc comment in types.ts**

  **File:** `packages/widget/src/types.ts:43`

  Change:
  ```typescript
  /** Footer text color - default: rgba(255, 255, 255, 0.8) */
  ```
  to:
  ```typescript
  /** Footer text color - default: #ffffff */
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add packages/widget/src/theme/default.css packages/widget/src/types.ts
  git commit -m "fix(widget): update footer text color fallback and docs to hex"
  ```

### Task 3: Verify build

- [ ] **Step 1: Run type-check**

  ```bash
  cd packages/widget && bun run type-check
  ```
  Expected: `0 errors`

- [ ] **Step 2: Build widget**

  ```bash
  cd packages/widget && bun run build
  ```
  Expected: `dist/widget-bundle.js` created without errors

- [ ] **Step 3: Run project-wide check**

  ```bash
  cd /workspaces/pb138 && bun run check --write --unsafe
  ```
  Expected: no formatting changes other than what we touched

- [ ] **Step 4: Commit if any auto-format changes**

  ```bash
  git add -A && git commit -m "chore: biome formatting" || true
  ```
