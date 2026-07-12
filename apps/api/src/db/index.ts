import * as schema from "db/schema"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { config } from "@/common/config"

const queryClient = postgres(config.DATABASE_URL)
export const db = drizzle(queryClient, { schema })
export type DB = typeof db

// Raw query (not drizzle) so timeout can .cancel() it instead of leaking
export async function checkDbConnection(timeoutMs: number): Promise<void> {
	const query = queryClient`SELECT 1`
	const timer = setTimeout(() => query.cancel(), timeoutMs)
	try {
		await query
	} finally {
		clearTimeout(timer)
	}
}
