import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js"
import svgr from "vite-plugin-svgr"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig(({ mode }) => {
	const isDev = mode === "development"

	return {
		plugins: [react(), svgr(), cssInjectedByJsPlugin()],
		server: {
			port: 5174,
			cors: true,
		},
		define: {
			// Replace process.env.NODE_ENV for browser bundle
			"process.env.NODE_ENV": JSON.stringify(mode),
		},
		build: {
			lib: {
				entry: resolve(__dirname, "src/main.tsx"),
				formats: ["iife"],
				name: "AIWidget",
				fileName: () => "widget-bundle.js",
			},
			rollupOptions: {
				output: {
					inlineDynamicImports: true,
				},
			},
			cssCodeSplit: false,
			minify: "esbuild",
		},
	}
})
