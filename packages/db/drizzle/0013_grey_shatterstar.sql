CREATE TABLE "widget_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"bot_name" varchar(255) DEFAULT 'AI Assistant' NOT NULL,
	"position" varchar(10) DEFAULT 'right' NOT NULL,
	"light_colors" jsonb NOT NULL,
	"dark_colors" jsonb NOT NULL,
	"icons" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "widget_configs_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
ALTER TABLE "widget_configs" ADD CONSTRAINT "widget_configs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;