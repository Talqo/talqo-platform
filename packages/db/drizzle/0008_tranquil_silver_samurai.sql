CREATE TYPE "public"."provider_type" AS ENUM('openai', 'openai_compatible', 'google', 'anthropic');--> statement-breakpoint
CREATE TABLE "ai_provider_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"provider_type" "provider_type" NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"model" varchar(255) NOT NULL,
	"base_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_provider_configs_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
ALTER TABLE "ai_provider_configs" ADD CONSTRAINT "ai_provider_configs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_registrations" ADD CONSTRAINT "pending_registrations_consumed_by_client_id_clients_id_fk" FOREIGN KEY ("consumed_by_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;