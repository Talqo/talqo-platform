import * as Sentry from "@sentry/bun"
import { config } from "./config"

if (config.SENTRY_DSN) {
	Sentry.init({
		dsn: config.SENTRY_DSN,
		environment: config.SENTRY_ENVIRONMENT,
	})
}
