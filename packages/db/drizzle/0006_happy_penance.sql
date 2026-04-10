ALTER TABLE "pending_registrations" ADD COLUMN "consumed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "pending_registrations" ADD COLUMN "consumed_by_client_id" uuid;