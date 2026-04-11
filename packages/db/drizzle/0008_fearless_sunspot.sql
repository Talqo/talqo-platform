CREATE TABLE "password_reset_tokens" (
	"token" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "pending_registrations" ADD CONSTRAINT "pending_registrations_consumed_by_client_id_clients_id_fk" FOREIGN KEY ("consumed_by_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;