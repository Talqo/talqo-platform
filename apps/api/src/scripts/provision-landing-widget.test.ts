import { describe, expect, it } from "bun:test"
import {
	buildLandingWidgetClientValues,
	LANDING_WIDGET_CLIENT,
} from "./provision-landing-widget"

describe("landing widget provisioning", () => {
	it("builds a demo client with the public landing widget token and unknown password hash", () => {
		const values = buildLandingWidgetClientValues("existing-hash")

		expect(values).toEqual({
			id: "00000000-0000-4000-8000-000000000012",
			name: "Talqo Demo",
			email: "demo@talqo.dev",
			passwordHash: "existing-hash",
			balanceUsd: 100_000,
			monthlyUsageLimit: 10_000,
			usageAlertThresholdUsd: 8_000,
			widgetToken: "00000000-0000-4000-8001-000000000012",
			status: "active",
			widgetSetupDismissed: true,
		})
	})

	it("keeps the token constant public and non-nil", () => {
		expect(LANDING_WIDGET_CLIENT.widgetToken).not.toBe(
			"00000000-0000-0000-0000-000000000000",
		)
		expect(LANDING_WIDGET_CLIENT.widgetToken).toBe(
			"00000000-0000-4000-8001-000000000012",
		)
	})
})
