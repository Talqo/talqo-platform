import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js"
import svgr from "vite-plugin-svgr"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
	plugins: [react(), svgr(), cssInjectedByJsPlugin()],
	server: {
		port: 5174,
		// Enable CORS for cross-origin widget loading during dev
		cors: true,
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
		assetsDir: ".",
		cssCodeSplit: false,
		minify: "esbuild",
	},
})
