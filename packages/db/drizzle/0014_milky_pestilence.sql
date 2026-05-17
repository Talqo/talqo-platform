ALTER TABLE "pre_made_mcp_servers" ADD COLUMN "name" text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE "pre_made_mcp_servers" ALTER COLUMN "name" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "pre_made_mcp_servers" ADD COLUMN "description" text;