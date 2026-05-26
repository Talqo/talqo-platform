ALTER TABLE "clients" ALTER COLUMN "balance_usd" SET DATA TYPE numeric(14, 8);--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "balance_usd" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "usage_records" ALTER COLUMN "cost_usd" SET DATA TYPE numeric(14, 8);