# Remove AI-Generated Image from Add Funds Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the AI-generated image banner in the Billing Settings tab with a standard outlined button linking to the Add Funds page.

**Architecture:** Single-file UI change. Remove the `<img>` element and its import, replace with a shadcn `<Button variant="outline">` wrapped in a TanStack `<Link>`. Update i18n strings across three locale files. Clean up the orphaned asset.

**Tech Stack:** React, TanStack Router, shadcn/ui, react-i18next, Biome, TypeScript

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `apps/web/src/components/settings/BillingSettingsTab.tsx` | Modify | Remove image import; replace image banner with outline button |
| `apps/web/public/locales/en/translation.json` | Modify | Add `settings.billing.addFunds` key |
| `apps/web/public/locales/cs/translation.json` | Modify | Add `settings.billing.addFunds` key |
| `apps/web/public/locales/zh/translation.json` | Modify | Add `settings.billing.addFunds` key |
| `apps/web/src/assets/Gemini_Generated_Image_7dq4tr7dq4tr7dq4.png` | Delete | Remove orphaned AI-generated image |

---

### Task 1: Replace Image with Button in BillingSettingsTab

**Files:**
- Modify: `apps/web/src/components/settings/BillingSettingsTab.tsx`

- [ ] **Step 1: Remove image import**

  Delete line 12 (the `upgradeImage` import):
  ```tsx
  import upgradeImage from "@/assets/Gemini_Generated_Image_7dq4tr7dq4tr7dq4.png"
  ```

- [ ] **Step 2: Replace image banner with outline button**

  Replace lines 127–137 (the `<Link>` wrapping `<img>`) with:
  ```tsx
  <Link to="/dashboard/add-funds">
  	<Button variant="outline">{t("settings.billing.addFunds")}</Button>
  </Link>
  ```

  The existing `CardFooter` already uses `className="flex justify-between"`, so the outline button naturally sits on the left and the primary "Save Settings" submit button stays on the right.

- [ ] **Step 3: Run type-check**

  Run: `bun run type-check`
  Expected: No type errors.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/src/components/settings/BillingSettingsTab.tsx
  git commit -m "feat(settings): replace add-funds image banner with outline button"
  ```

---

### Task 2: Add Translations

**Files:**
- Modify: `apps/web/public/locales/en/translation.json`
- Modify: `apps/web/public/locales/cs/translation.json`
- Modify: `apps/web/public/locales/zh/translation.json`

- [ ] **Step 1: Add English translation**

  In `apps/web/public/locales/en/translation.json`, inside `settings.billing` (after `"saveSettings"`), add:
  ```json
  "addFunds": "Add Funds"
  ```

- [ ] **Step 2: Add Czech translation**

  In `apps/web/public/locales/cs/translation.json`, inside `settings.billing` (after `"saveSettings"`), add:
  ```json
  "addFunds": "Přidat prostředky"
  ```

- [ ] **Step 3: Add Chinese translation**

  In `apps/web/public/locales/zh/translation.json`, inside `settings.billing` (after `"saveSettings"`), add:
  ```json
  "addFunds": "添加资金"
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/public/locales/en/translation.json apps/web/public/locales/cs/translation.json apps/web/public/locales/zh/translation.json
  git commit -m "feat(i18n): add settings.billing.addFunds translations"
  ```

---

### Task 3: Clean Up Orphaned Asset

**Files:**
- Delete: `apps/web/src/assets/Gemini_Generated_Image_7dq4tr7dq4tr7dq4.png`

- [ ] **Step 1: Verify no references remain**

  Run: `grep -r "Gemini_Generated_Image" apps/web/src/`
  Expected: No matches.

- [ ] **Step 2: Delete the file**

  ```bash
  git rm apps/web/src/assets/Gemini_Generated_Image_7dq4tr7dq4tr7dq4.png
  ```

- [ ] **Step 3: Commit**

  ```bash
  git commit -m "chore(assets): remove unused ai-generated image"
  ```

---

### Task 4: Feedback Loop

- [ ] **Step 1: Run Biome fix**

  Run: `bun run fix`
  Expected: No unfixable issues.

- [ ] **Step 2: Run type-check**

  Run: `bun run type-check`
  Expected: No type errors.

- [ ] **Step 3: Check requirements doc**

  Review `docs/requirements.md` for any requirements related to Add Funds UI or billing settings. Update `Completion` status if applicable.

- [ ] **Step 4: Final status check**

  Run: `git log --oneline -5`
  Expected: Three commits on branch `SCRUM-206`:
  1. `feat(settings): replace add-funds image banner with outline button`
  2. `feat(i18n): add settings.billing.addFunds translations`
  3. `chore(assets): remove unused ai-generated image`
