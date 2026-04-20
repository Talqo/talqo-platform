import {
	ConflictError,
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from "../../common/errors"
import type { ClientAccountRepository } from "./client-account.repository"

export class ClientAccountService {
	constructor(private readonly repo: ClientAccountRepository) {}

	async getProfile(clientId: string) {
		const client = await this.repo.getClientById(clientId)
		if (!client) throw new NotFoundError("Client not found")
		return client
	}

	async updateProfile(
		clientId: string,
		data: Partial<{ name: string; email: string }>,
	) {
		if (data.email) {
			const existing = await this.repo.findByEmail(data.email)
			if (existing && existing.id !== clientId) {
				throw new ConflictError("Email already in use")
			}
		}
		const updated = await this.repo.updateClient(clientId, data)
		if (!updated) throw new NotFoundError("Client not found")
		return updated
	}

	async changePassword(
		clientId: string,
		data: { currentPassword: string; newPassword: string },
	) {
		const hash = await this.repo.getPasswordHash(clientId)
		if (!hash) throw new NotFoundError("Client not found")

		const valid = await Bun.password.verify(data.currentPassword, hash)
		if (!valid) throw new UnauthorizedError("Current password is incorrect")

		const newHash = await Bun.password.hash(data.newPassword, {
			algorithm: "argon2id",
		})
		await this.repo.updatePassword(clientId, newHash)
	}

	async addFunds(clientId: string, amount: number) {
		if (amount <= 0) throw new ValidationError("Amount must be positive")
		const updated = await this.repo.addBalance(clientId, amount.toFixed(4))
		if (!updated) throw new NotFoundError("Client not found")
		return updated
	}

	async setUsageLimit(clientId: string, limit: number | null) {
		if (limit !== null && limit < 0)
			throw new ValidationError("Limit must be non-negative")
		await this.repo.setUsageLimit(
			clientId,
			limit !== null ? limit.toFixed(4) : null,
		)
	}

	async setUsageAlert(clientId: string, thresholdUsd: number | null) {
		if (thresholdUsd !== null && thresholdUsd < 0)
			throw new ValidationError("Threshold must be non-negative")
		await this.repo.setUsageAlert(
			clientId,
			thresholdUsd !== null ? thresholdUsd.toFixed(4) : null,
		)
	}

	async dismissWidgetSetup(clientId: string) {
		const updated = await this.repo.updateClient(clientId, {
			widgetSetupDismissed: true,
		})
		if (!updated) throw new NotFoundError("Client not found")
		return updated
	}
}
