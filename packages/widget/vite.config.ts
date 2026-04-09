import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import svgr from "vite-plugin-svgr"

const __dirname = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
	plugins: [react(), svgr()],
	build: {
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			formats: ["es", "cjs"],
			fileName: "index",
		},
		rollupOptions: {
			external: ["react", "react-dom", "react/jsx-runtime"],
			output: {
				assetFileNames: "[name][extname]",
			},
		},
	},
})
