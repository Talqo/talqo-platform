export function formatPeriod(period: string): string {
	return new Date(period).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	})
}

type Client = {
	id: string
	name: string
	email: string
	balanceUsd: string
	status: string
	lastActive: string | null
	createdAt: string
	totalTokens: number
}

type Tenant = {
	id: string
	name: string
	status: "active" | "suspended"
	apiType: string
	tokenUsage: string
}

const ALLOWED_STATUSES = new Set(["active", "suspended"])

export function mapClientsToTenants(
	clients: Client[],
	defaultApiType: string,
): Tenant[] {
	return clients.map((client) => ({
		id: client.id,
		name: client.name || client.email,
		status:
			client.status && ALLOWED_STATUSES.has(client.status)
				? (client.status as "active" | "suspended")
				: "active",
		apiType: defaultApiType,
		tokenUsage: client.totalTokens.toLocaleString(),
	}))
}
