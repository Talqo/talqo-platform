import type { DB } from "@/db"
import { adminAccessLogs } from "@/db/schema"

export type AuditLogEntry = typeof adminAccessLogs.$inferInsert

export class AdminAuditLogRepository {
	constructor(private readonly db: DB) {}

	async insert(entry: AuditLogEntry) {
		await this.db.insert(adminAccessLogs).values(entry)
	}
}
