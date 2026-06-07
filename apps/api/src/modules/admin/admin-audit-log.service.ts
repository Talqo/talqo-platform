import type { AdminAuditLogRepository } from "./admin-audit-log.repository"

export class AdminAuditLogService {
	constructor(private readonly repo: AdminAuditLogRepository) {}

	async insert(
		entry: Parameters<AdminAuditLogRepository["insert"]>[0],
	): Promise<void> {
		return this.repo.insert(entry)
	}
}
