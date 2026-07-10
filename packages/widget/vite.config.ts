import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js"
import svgr from "vite-plugin-svgr"

const __dirname = fileURLToPath(new URL(".", import.meta.url))
const viteWidgetPort = Number(process.env.VITE_WIDGET_PORT)
const port =
	viteWidgetPort >= 1 && viteWidgetPort <= 65535 ? viteWidgetPort : 5174
const viteWidgetBundlePort = Number(process.env.VITE_WIDGET_BUNDLE_PORT)
const bundlePort =
	viteWidgetBundlePort >= 1 && viteWidgetBundlePort <= 65535
		? viteWidgetBundlePort
		: 5175

export default defineConfig(({ mode }) => {
	const isDevelopment =
		mode === "development" || process.env.NODE_ENV === "development"

	return {
		resolve: {
			alias: {
				"@": resolve(__dirname, "./src"),
			},
		},
		plugins: [
			react(),
			svgr(),
			isDevelopment ? null : cssInjectedByJsPlugin(),
		].filter(Boolean),
		server: {
			port,
			strictPort: true,
			cors: true,
		},
		preview: {
			port: bundlePort,
			strictPort: true,
			cors: true,
		},
		define: {
			// Replace process.env.NODE_ENV for browser bundle
			"process.env.NODE_ENV": JSON.stringify(
				isDevelopment ? "development" : "production",
			),
			"process.env": JSON.stringify({
				NODE_ENV: isDevelopment ? "development" : "production",
			}),
		},
		build: isDevelopment
			? {} // Regular SPA build for dev mode (uses index.html)
			: {
					lib: {
						entry: resolve(__dirname, "src/main.tsx"),
						formats: ["iife"],
						name: "AIWidget",
						fileName: () => "widget-bundle.js",
					},
					rollupOptions: {
						// Bundle React into the IIFE (no external deps)
						external: [],
						output: {
							inlineDynamicImports: true,
						},
					},
					cssCodeSplit: false,
					minify: "esbuild",
				},
	}
})
