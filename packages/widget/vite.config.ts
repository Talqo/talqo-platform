import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js"
import svgr from "vite-plugin-svgr"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig(({ mode }) => {
	const isDevelopment =
		mode === "development" || process.env.NODE_ENV === "development"

	return {
		plugins: [
			react(),
			svgr(),
			isDevelopment ? null : cssInjectedByJsPlugin(),
		].filter(Boolean),
		server: {
			port: 5174,
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
