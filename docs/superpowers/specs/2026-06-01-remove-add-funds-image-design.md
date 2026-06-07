# Remove AI-Generated Image from Add Funds Flow

**Date:** 2026-06-01
**Branch:** SCRUM-206
**Approach:** A — Primary Button in Card Footer

## Problem

The Billing Settings tab (`BillingSettingsTab.tsx`) displays an AI-generated image (`Gemini_Generated_Image_7dq4tr7dq4tr7dq4.png`) as a banner link to the Add Funds page. This image is the only AI-generated asset in the add funds flow and needs to be replaced with something more appropriate and maintainable.

## Scope

- Remove the image import and usage from `BillingSettingsTab.tsx`.
- Do NOT modify `dashboard.add-funds.tsx` or `AddFundsForm.tsx` — those pages contain no images.
- Delete the image asset file if it becomes unused after removal.

## Design

### UI Change

In `BillingSettingsTab.tsx`, replace the footer `<Link>` that wraps an `<img>`:

```tsx
<Link
  to="/dashboard/add-funds"
  className="relative h-16 overflow-hidden rounded-md border-2 border-primary ..."
>
  <img src={upgradeImage} alt={t("settings.billing.upgradePlan")} ... />
</Link>
```

With a `Link` wrapped around a `Button` using `variant="outline"`:

```tsx
<Link to="/dashboard/add-funds">
  <Button variant="outline">{t("settings.billing.addFunds")}</Button>
</Link>
```

The existing primary "Save Settings" submit button remains unchanged. The outline variant preserves visual hierarchy while still providing a clear CTA.

### Layout

Both buttons live in the same `CardFooter` with `className="flex justify-between"`. The outline button naturally aligns to the left; the primary submit button stays on the right. No layout CSS changes are required.

### i18n

A new translation key `settings.billing.addFunds` is required. It must be added to all three locale files:

- `public/locales/en/translation.json`
- `public/locales/cs/translation.json`
- `public/locales/zh/translation.json`

Value: `"Add Funds"` (EN), `"Přidat prostředky"` (CS), `"添加资金"` (ZH).

### Asset Cleanup

After removing the import, verify that `Gemini_Generated_Image_7dq4tr7dq4tr7dq4.png` is no longer referenced anywhere in the codebase. If unused, delete it from `apps/web/src/assets/`.

## Implementation Plan

1. Remove image import from `BillingSettingsTab.tsx`.
2. Replace image `<Link>` with outline `<Button>` inside `<Link>`.
3. Add `settings.billing.addFunds` translations to EN, CS, and ZH files.
4. Verify no other files reference the image; delete the PNG if orphaned.
5. Run feedback loop: `bun run fix`, `bun run type-check`.
6. Commit changes with conventional commit format.

## Out of Scope

- Changes to `AddFundsForm.tsx` or the `/dashboard/add-funds` route.
- Extracting a reusable component (Approach C).
- Any visual mockups or new assets.
