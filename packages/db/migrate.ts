import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const {
	POSTGRES_USER,
	POSTGRES_PASSWORD,
	POSTGRES_HOST,
	POSTGRES_PORT,
	POSTGRES_DB,
} = process.env

const url = `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`
console.log(
	`Connecting to ${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB} as ${POSTGRES_USER}`,
)

const sql = postgres(url, { max: 1 })
const db = drizzle(sql)

// Resolved at import time relative to this file's location, not CWD
const migrationsFolder = `${import.meta.dir}/drizzle`

try {
	await sql`CREATE EXTENSION IF NOT EXISTS vector`
	await migrate(db, { migrationsFolder })
	console.log("Migrations applied successfully.")
} catch (error) {
	console.error("Migration failed:", error)
	process.exit(1)
} finally {
	await sql.end()
}
