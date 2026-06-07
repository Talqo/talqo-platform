import { execFileSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../..",
)

export default function globalSetup() {
	execFileSync(
		"bun",
		[
			"--env-file",
			path.join(root, ".env.example"),
			path.join(root, "apps/api/src/db/seed.ts"),
		],
		{ stdio: "inherit" },
	)
}
