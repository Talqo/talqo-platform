import { execFileSync } from "node:child_process"
import path from "node:path"

// Avoid import.meta.url here — Playwright transforms this file to
// CommonJS (no "type": "module" in package.json), and mixing that with
// import.meta throws "exports is not defined in ES module scope".
const root = path.resolve(__dirname, "../../../..")
const apiDir = path.join(root, "apps/api")

export default function globalSetup() {
	// Bun resolves apps/api's "@/*" tsconfig path alias relative to its own
	// cwd, not the seed script's location — must run with cwd: apiDir.
	execFileSync(
		"bun",
		["--env-file", path.join(root, ".env.example"), "src/db/seed.ts"],
		{ stdio: "inherit", cwd: apiDir },
	)
}
