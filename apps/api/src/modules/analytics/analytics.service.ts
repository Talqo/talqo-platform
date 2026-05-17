import { ValidationError } from "@/common/errors"
import type { AnalyticsRepository } from "./analytics.repository"

type Granularity = "day" | "week" | "month"
type RawParams = { from?: string; to?: string; granularity?: string }

const GRANULARITIES: Granularity[] = ["day", "week", "month"]
const DEFAULT_RANGE_MS = 30 * 24 * 60 * 60 * 1000

function parseDate(value: string | undefined, fallback: Date): Date {
	if (!value) return fallback
	const d = new Date(value)
	if (Number.isNaN(d.getTime()))
		throw new ValidationError(`Invalid date: ${value}`)
	return d
}

function parseAnalyticsParams(params: RawParams): {
	from: Date
	to: Date
	granularity: Granularity
} {
	const granularity = (params.granularity ?? "day") as Granularity
	if (!GRANULARITIES.includes(granularity)) {
		throw new ValidationError(
			`granularity must be one of: ${GRANULARITIES.join(", ")}`,
		)
	}
	const to = parseDate(params.to, new Date())
	const from = parseDate(params.from, new Date(to.getTime() - DEFAULT_RANGE_MS))
	return { from, to, granularity }
}

export class AnalyticsService {
	constructor(private readonly repo: AnalyticsRepository) {}

	async getTokenAnalytics(clientId: string, params: RawParams) {
		const { from, to, granularity } = parseAnalyticsParams(params)
		return this.repo.getTokenUsage(clientId, from, to, granularity)
	}

	async getMessageAnalytics(clientId: string, params: RawParams) {
		const { from, to, granularity } = parseAnalyticsParams(params)
		return this.repo.getMessageCounts(clientId, from, to, granularity)
	}

	async getClientSummary(clientId: string) {
		return this.repo.getClientSummary(clientId)
	}

	async getPlatformStats() {
		return this.repo.getPlatformStats()
	}

	async getAdminTokenAnalytics(params: RawParams) {
		const { from, to, granularity } = parseAnalyticsParams(params)
		return this.repo.getPlatformTokenUsageOverTime(from, to, granularity)
	}

	async getAdminConversationAnalytics(params: RawParams) {
		const { from, to, granularity } = parseAnalyticsParams(params)

		return this.repo.getPlatformConversationCountsOverTime(
			from,
			to,
			granularity,
		)
	}

	async getAdminSummary() {
		const [stats, activeTenants, avgSatisfaction] = await Promise.all([
			this.repo.getPlatformStats(),
			this.repo.getActiveTenantCount(30),
			this.repo.getAvgPlatformSatisfaction(),
		])
		return {
			...stats,
			activeTenantsLast30Days: activeTenants,
			avgSatisfactionRating: avgSatisfaction,
		}
	}
}
