# Widget package

Standalone chat widget that embeds on customer sites as a single self-contained IIFE bundle.

## Key architecture decisions

- **Output: IIFE, not a library** — builds to `dist/widget-bundle.js` via `vite build --mode production`. Customers embed it with a `<script>` tag, not `import`.
- **React is bundled in** — `rollupOptions.external: []` intentionally bundles React. This avoids version conflicts on arbitrary host pages.
- **CSS injected by JS** — `vite-plugin-css-injected-by-js` embeds all styles into the bundle (no separate `.css` file). This plugin is disabled in dev mode so hot-reload works normally.
- **`private: true`** — not published to npm despite being a "public" widget. Distribution is via CDN/static hosting, not npm.

## Runtime config

Customers configure the widget before the `<script>` tag loads:

```js
window.__AI_WIDGET_CONFIG__ = { clientId: "...", apiUrl: "..." }
```

Required fields: `clientId`, `apiUrl`. See `src/types.ts` for the full `WidgetConfig` interface.

## Theming

- Colors are injected as CSS custom properties on `#ai-widget-root` at init time (see `injectCSSVariables` in `src/main.tsx`).
- Variable naming: `--widget-*` for light, `--widget-dark-*` for dark. Dark colors are auto-generated from light if not provided.
- All class names use the `aiw-` prefix (e.g. `aiw-root`, `aiw-panel`, `aiw-trigger`) — never Tailwind in this package.
- Host page z-index can be overridden via `--aiw-z-index` CSS variable (default: 999999) — uses the `aiw-` prefix, not `--widget-*`, because it is a static CSS override hook rather than a JS-injected color variable.
- Theme is persisted to `localStorage` under the namespaced key `pagepal:widget:theme`.

## Dev modes

- `bun run dev` — SPA mode (uses `index.html`, hot reload, CSS not injected). Used for UI development.
- `bun run dev:bundle` — watch + IIFE build + preview on port 5174. Used to test the actual bundle as embedded on a page.
- `bun run build` — `tsc` then Vite IIFE build for production.

## Component structure

- `src/primitives/` — headless UI primitives consuming `WidgetContext`; compose them in `EmbeddedWidget.tsx`, not elsewhere.
- `src/hooks/useWidget.ts` — all widget state; `getInitialTheme()` must be called outside React (SSR safety).
