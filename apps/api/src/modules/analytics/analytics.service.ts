import { ValidationError } from "../../common/errors"
import type { AnalyticsRepository } from "./analytics.repository"

type Granularity = "day" | "week" | "month"

const GRANULARITIES: Granularity[] = ["day", "week", "month"]

function parseDate(value: string | undefined, fallback: Date): Date {
	if (!value) return fallback
	const d = new Date(value)
	if (Number.isNaN(d.getTime()))
		throw new ValidationError(`Invalid date: ${value}`)
	return d
}

export class AnalyticsService {
	constructor(private readonly repo: AnalyticsRepository) {}

	async getTokenAnalytics(
		clientId: string,
		params: { from?: string; to?: string; granularity?: string },
	) {
		const granularity = (params.granularity ?? "day") as Granularity
		if (!GRANULARITIES.includes(granularity)) {
			throw new ValidationError(
				`granularity must be one of: ${GRANULARITIES.join(", ")}`,
			)
		}

		const to = parseDate(params.to, new Date())
		const from = parseDate(
			params.from,
			new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000),
		)

		return this.repo.getTokenUsage(clientId, from, to, granularity)
	}

	async getMessageAnalytics(
		clientId: string,
		params: { from?: string; to?: string; granularity?: string },
	) {
		const granularity = (params.granularity ?? "day") as Granularity
		if (!GRANULARITIES.includes(granularity)) {
			throw new ValidationError(
				`granularity must be one of: ${GRANULARITIES.join(", ")}`,
			)
		}

		const to = parseDate(params.to, new Date())
		const from = parseDate(
			params.from,
			new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000),
		)

		return this.repo.getMessageCounts(clientId, from, to, granularity)
	}

	async getPlatformStats() {
		return this.repo.getPlatformStats()
	}
}
