# Talqo

Bun + Turbo monorepo. Apps: `apps/web` (Vite, React 19, Tailwind v4, TanStack
Router, TanStack Query) and `apps/widget` (`@talqo/widget`, chat widget library
consumed by web as a built dist).

## Theme / motif (apps/web)

Tokens live in `apps/web/src/styles/tokens.css`:

- `:root` defines the primitive palette (`--color-*-50…950`) and the semantic
  motif tokens for light mode (`--background`, `--foreground`, `--primary`,
  `--accent`, `--secondary`, `--muted`, `--card`, `--border`, `--sidebar-*`, …).
- `html.dark` redefines the same semantic tokens for dark mode.
- `@custom-variant dark (&:is(.dark *))` makes Tailwind's `dark:` utilities
  follow the `.dark` class instead of the OS media query.

How to use:

- Always style with semantic token classes (`bg-background`,
  `text-foreground`, `bg-primary`, `text-muted-foreground`, `border-border`,
  `bg-sidebar`, …), never raw palette colors, so both themes work for free.
- To change the motif, edit the semantic tokens in `tokens.css` (both the
  `:root` and `html.dark` blocks); every component follows automatically.

Theme switching:

- `apps/web/src/lib/use-theme.ts` persists the choice in localStorage under
  `talqo-theme` and toggles the `.dark` class on `<html>` via `applyTheme()`.
- Initial value: stored preference wins, otherwise `prefers-color-scheme`.
- `main.tsx` calls `applyTheme(getInitialTheme())` before render to avoid a
  flash of the wrong theme.
- The toggle lives in the dashboard header (top right).

## Translations

There are two independent i18n setups, both driven by the **same language
preference**: `apps/web/src/lib/use-language.ts` persists it in localStorage
under `talqo-language` and shares it between consumers within the tab
(header switch, dashboard UI, widget previews).

Supported languages are enumerated once, in the widget package:
`widgetLanguages` in `apps/widget/src/lib/i18n.ts` (currently en, cs, zh).

### Dashboard UI (apps/web)

- Locale JSON: `apps/web/src/locales/{en,cs,zh}.json` (nested keys, e.g.
  `"nav.dashboard"`, `"dashboard.cards.bots.title"`).
- Setup: `apps/web/src/lib/i18n.ts` — initializes the default i18next
  instance with `react-i18next`, seeded from the stored preference and kept
  in sync via `subscribeLanguage()`. Imported for side effects in
  `main.tsx`.
- Usage in components: `const { t } = useTranslation();` then
  `t("nav.dashboard")`, with interpolation via `t("key", { title })`.

Translated scope: dashboard layout (nav menu + header controls) and the
dashboard home page. Other dashboard pages are English-only for now.

### Widget chat UI (apps/widget)

- Locale JSON: `apps/widget/src/locales/{en,cs,zh}.json` — flat key/value
  pairs (e.g. `"greeting": "…"`).
- Registry: `apps/widget/src/lib/i18n.ts` — `widgetLanguages` (code → display
  name), `isWidgetLanguage()` guard, and `createWidgetI18n()` which builds an
  isolated i18next instance (isolated so the widget never clashes with the
  web app's default instance).
- `EmbeddedWidget` creates the instance from its `language` prop and calls
  `changeLanguage` when the prop changes; UI strings come from
  `useTranslation()`.
- `WidgetPreview` (web) defaults to the shared preference when no explicit
  `language` prop is passed; the full-screen preview route
  (`/widget-preview`) accepts `?language=` validated with
  `isWidgetLanguage()`; the CDN embed accepts `data-talqo-language="<code>"`
  (`apps/widget/src/widget.tsx`).

### How to add a language

1. Add `apps/widget/src/locales/<code>.json` with the same keys as `en.json`.
2. In `apps/widget/src/lib/i18n.ts`: import the JSON, add an entry to
   `widgetLanguages`, and add it to `resources` in `createWidgetI18n()`.
3. Add `apps/web/src/locales/<code>.json` with the same keys as web's
   `en.json`, and register it in `apps/web/src/lib/i18n.ts` `resources`.
4. Nothing else — the header language switch and the widget setup page
   enumerate `widgetLanguages`, and both i18n instances pick the new code up.
