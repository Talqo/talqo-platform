ALTER TABLE "clients" ADD COLUMN "usage_alert_threshold_usd" numeric(12, 4);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "widget_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "status" varchar(50) DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_widget_token_unique" UNIQUE("widget_token");