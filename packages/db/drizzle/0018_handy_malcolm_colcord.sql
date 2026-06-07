ALTER TABLE "clients" ALTER COLUMN "balance_usd" SET DATA TYPE numeric(16, 8);--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "monthly_usage_limit" SET DATA TYPE numeric(16, 8);--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "usage_alert_threshold_usd" SET DATA TYPE numeric(16, 8);--> statement-breakpoint
ALTER TABLE "usage_records" ALTER COLUMN "cost_usd" SET DATA TYPE numeric(16, 8);