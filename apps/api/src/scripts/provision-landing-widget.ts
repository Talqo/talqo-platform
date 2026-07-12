import { randomUUID } from "node:crypto"
import { eq, or } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { logger } from "@/common/logger"
import * as schema from "@/db/schema"
import { clients } from "@/db/schema"

export const LANDING_WIDGET_CLIENT = {
	id: "00000000-0000-4000-8000-000000000012",
	widgetToken: "00000000-0000-4000-8001-000000000012",
	email: "demo@talqo.dev",
	name: "Talqo Demo",
	balanceUsd: 1_000,
	monthlyUsageLimit: 100,
	usageAlertThresholdUsd: 80,
} as const

export function buildLandingWidgetClientValues(passwordHash: string) {
	return {
		id: LANDING_WIDGET_CLIENT.id,
		name: LANDING_WIDGET_CLIENT.name,
		email: LANDING_WIDGET_CLIENT.email,
		passwordHash,
		balanceUsd: LANDING_WIDGET_CLIENT.balanceUsd,
		monthlyUsageLimit: LANDING_WIDGET_CLIENT.monthlyUsageLimit,
		usageAlertThresholdUsd: LANDING_WIDGET_CLIENT.usageAlertThresholdUsd,
		widgetToken: LANDING_WIDGET_CLIENT.widgetToken,
		status: "active",
		widgetSetupDismissed: true,
	}
}

function requiredEnv(name: string): string {
	const value = process.env[name]
	if (!value) throw new Error(`Missing required env var: ${name}`)
	return value
}

function optionalEnv(name: string, fallback: string): string {
	return process.env[name] || fallback
}

export async function provisionLandingWidget() {
	const pgClient = postgres({
		host: optionalEnv("POSTGRES_HOST", "localhost"),
		port: Number(optionalEnv("POSTGRES_PORT", "5432")),
		database: requiredEnv("POSTGRES_DB"),
		username: requiredEnv("POSTGRES_USER"),
		password: requiredEnv("POSTGRES_PASSWORD"),
		max: 1,
	})
	const db = drizzle(pgClient, { schema })

	try {
		const existing = await db.query.clients.findFirst({
			where: or(
				eq(clients.id, LANDING_WIDGET_CLIENT.id),
				eq(clients.email, LANDING_WIDGET_CLIENT.email),
				eq(clients.widgetToken, LANDING_WIDGET_CLIENT.widgetToken),
			),
			columns: { id: true, email: true, widgetToken: true },
		})

		if (existing) {
			if (
				existing.id !== LANDING_WIDGET_CLIENT.id ||
				existing.email !== LANDING_WIDGET_CLIENT.email ||
				existing.widgetToken !== LANDING_WIDGET_CLIENT.widgetToken
			) {
				throw new Error(
					"Landing widget client id, email, or token conflicts with another client",
				)
			}

			logger.info("Landing widget client already exists", {
				clientId: LANDING_WIDGET_CLIENT.id,
			})
			return
		}

		const passwordHash = await Bun.password.hash(randomUUID())
		const values = buildLandingWidgetClientValues(passwordHash)

		await db.insert(clients).values(values).onConflictDoNothing()

		logger.info("Landing widget client provisioned", {
			clientId: LANDING_WIDGET_CLIENT.id,
		})
	} finally {
		await pgClient.end()
	}
}

if (import.meta.main) {
	provisionLandingWidget().catch((error) => {
		logger.error("Failed to provision landing widget client", { error })
		process.exit(1)
	})
}
