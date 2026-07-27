import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [react()],
	build: {
		emptyOutDir: false,
		lib: {
			entry: path.resolve(__dirname, "src/widget.tsx"),
			name: "TalqoWidget",
			formats: ["iife"],
			fileName: "widget-bundle",
		},
		rollupOptions: {
			output: {
				entryFileNames: "widget-bundle.js",
				assetFileNames: "widget-bundle.[ext]",
			},
		},
	},
});
