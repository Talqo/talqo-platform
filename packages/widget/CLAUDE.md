# Widget package

Standalone chat widget. Embeds on customer sites as single self-contained IIFE bundle.

## Key architecture decisions

- **Output: IIFE, not library** — builds to `dist/widget-bundle.js` via `vite build --mode production`. Customers embed with `<script>` tag, not `import`
- **React bundled in** — `rollupOptions.external: []` intentionally bundles React. Avoids version conflicts on arbitrary host pages
- **CSS injected by JS** — `vite-plugin-css-injected-by-js` embeds all styles into bundle (no separate `.css` file). Disabled in dev mode so hot-reload works
- **`private: true`** — not published to npm. Distribution via CDN/static hosting

## Runtime config

Customers configure widget before `<script>` tag loads:

```js
window.__TALQO__ = { token: "..." }
```

Required fields: `token`. Visual config (colors, botName, position, icons) is fetched from the API at init time via `GET /widget/config` (authenticated with `X-Widget-Token`). Falls back to hardcoded defaults on fetch failure. See `src/types.ts` for `TalqoConfig` and `ResolvedWidgetConfig`.

## Theming

- Colors injected as CSS custom properties on `#ai-widget-root` at init time (see `injectCSSVariables` in `src/main.tsx`)
- Variable naming: `--widget-*` for light, `--widget-dark-*` for dark. Dark colors auto-generated from light if not provided
- All class names use `aiw-` prefix (e.g. `aiw-root`, `aiw-panel`, `aiw-trigger`) — never Tailwind in this package
- Host page z-index overridden via `--aiw-z-index` CSS variable (default: 999999) — uses `aiw-` prefix, not `--widget-*`, because it is static CSS override hook rather than JS-injected color variable
- Theme persisted to `localStorage` under namespaced key `talqo:widget:theme`

## Dev modes

- `bun run dev` — SPA mode (uses `index.html`, hot reload, CSS not injected). For UI development
- `bun run dev:bundle` — watch + IIFE build + preview on port 5174. For testing actual bundle as embedded on page
- `bun run build` — `tsc` then Vite IIFE build for production

## Component structure

- `src/primitives/` — headless UI primitives consuming `WidgetContext`; compose them in `EmbeddedWidget.tsx`, not elsewhere
- `src/hooks/useWidget.ts` — all widget state; `getInitialTheme()` must be called outside React (SSR safety)
