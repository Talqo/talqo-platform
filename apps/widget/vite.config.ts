import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	build: {
		lib: {
			entry: path.resolve(__dirname, "src/index.ts"),
			formats: ["es", "cjs"],
			fileName: "index",
		},
		rollupOptions: {
			// Runtime deps stay external so consumers' bundlers resolve them via
			// their ESM entry points. Bundling the CJS dists (e.g. react-i18next's
			// use-sync-external-store) emits runtime `require("react")` calls that
			// crash in browser ESM.
			external: [
				"react",
				"react-dom",
				"react/jsx-runtime",
				"class-variance-authority",
				"clsx",
				"i18next",
				"radix-ui",
				"react-i18next",
				"tailwind-merge",
			],
		},
	},
});
