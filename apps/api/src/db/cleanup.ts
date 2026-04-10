#!/usr/bin/env bun
import { clients, pendingRegistrations } from "db/schema"
/**
 * Cleanup script to clear all clients and pending registrations for testing
 */
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { config } from "../common/config"

const queryClient = postgres(config.DATABASE_URL)
const db = drizzle(queryClient)

async function cleanup() {
	console.log("Cleaning up database...")

	// Delete all pending registrations
	const deletedPending = await db.delete(pendingRegistrations).returning()
	console.log(`Deleted ${deletedPending.length} pending registrations`)

	// Delete all clients
	const deletedClients = await db.delete(clients).returning()
	console.log(`Deleted ${deletedClients.length} clients`)

	console.log("Cleanup complete!")
	process.exit(0)
}

cleanup().catch((err) => {
	console.error("Cleanup failed:", err)
	process.exit(1)
})
