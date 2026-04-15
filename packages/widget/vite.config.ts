import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js"
import svgr from "vite-plugin-svgr"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig(() => {
	// Always use production mode for the embeddable bundle
	const nodeEnv = JSON.stringify("production")

	return {
		plugins: [react(), svgr(), cssInjectedByJsPlugin()],
		server: {
			port: 5174,
			cors: true,
		},
		mode: "production",
		define: {
			// Replace process.env.NODE_ENV for browser bundle
			"process.env.NODE_ENV": nodeEnv,
			"process.env": { NODE_ENV: "production" },
		},
		build: {
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
