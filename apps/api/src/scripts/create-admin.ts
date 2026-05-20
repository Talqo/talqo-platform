import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "@/db/schema"
import { adminUsers } from "@/db/schema"

// One-shot ops CLI — console.* is intentional; NDJSON logger is unreadable for human ops use

const [email, passwordArg] = process.argv.slice(2)

if (!email) {
	console.error(
		"Usage: bun create-admin.ts <email> [password]  (password may also be piped via stdin)",
	)
	process.exit(1)
}

const password = passwordArg || (await Bun.stdin.text()).trim()

if (!password) {
	console.error("ERROR: password is required (pass as argument or via stdin)")
	process.exit(1)
}

const {
	POSTGRES_USER,
	POSTGRES_PASSWORD,
	POSTGRES_HOST = "localhost",
	POSTGRES_PORT = "5432",
	POSTGRES_DB,
} = process.env

if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) {
	console.error(
		"ERROR: POSTGRES_USER, POSTGRES_PASSWORD, and POSTGRES_DB are required",
	)
	process.exit(1)
}

const client = postgres({
	host: POSTGRES_HOST,
	port: Number(POSTGRES_PORT),
	user: POSTGRES_USER,
	password: POSTGRES_PASSWORD,
	database: POSTGRES_DB,
	max: 1,
})
const db = drizzle(client, { schema })

try {
	const passwordHash = await Bun.password.hash(password)
	await db.insert(adminUsers).values({ email, passwordHash })
	console.log(`Admin created: ${email}`)
} finally {
	await client.end()
}
