import {
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from "../../common/errors"
import { signToken } from "../../common/jwt"
import type { AdminRepository } from "./admin.repository"

const VALID_STATUSES = ["active", "suspended"] as const
type ClientStatus = (typeof VALID_STATUSES)[number]

export class AdminService {
	constructor(private readonly repo: AdminRepository) {}

	async login(data: { email: string; password: string }) {
		const admin = await this.repo.findAdminByEmail(
			data.email.trim().toLowerCase(),
		)
		if (!admin) {
			throw new UnauthorizedError("Invalid email or password")
		}

		const valid = await Bun.password.verify(data.password, admin.passwordHash)
		if (!valid) {
			throw new UnauthorizedError("Invalid email or password")
		}

		const token = await signToken({ sub: admin.id, role: "admin" })
		return { token, admin: { id: admin.id, email: admin.email } }
	}

	async getAdminById(adminId: string) {
		const admin = await this.repo.findAdminById(adminId)
		if (!admin) return null
		return { id: admin.id, email: admin.email }
	}

	async listClients(limit: number, offset: number) {
		return this.repo.listClients(limit, offset)
	}

	async getClient(clientId: string) {
		const client = await this.repo.getClientDetail(clientId)
		if (!client) throw new NotFoundError("Client not found")
		return client
	}

	async updateClientStatus(clientId: string, status: string) {
		if (!VALID_STATUSES.includes(status as ClientStatus)) {
			throw new ValidationError(
				`status must be one of: ${VALID_STATUSES.join(", ")}`,
			)
		}
		const updated = await this.repo.updateClientStatus(clientId, status)
		if (!updated) throw new NotFoundError("Client not found")
		return updated
	}

	async listConversations(params: {
		clientId?: string
		limit: number
		offset: number
	}) {
		return this.repo.listConversations(params)
	}

	async getConversation(conversationId: string) {
		const conv = await this.repo.getConversationWithMessages(conversationId)
		if (!conv) throw new NotFoundError("Conversation not found")
		return conv
	}

	async impersonate(clientId: string) {
		const client = await this.repo.getClientDetail(clientId)
		if (!client) throw new NotFoundError("Client not found")

		// Short-lived impersonation token (1 hour)
		const token = await signToken(
			{ sub: clientId, role: "client", imp: true },
			"1h",
		)
		return { token }
	}
}
