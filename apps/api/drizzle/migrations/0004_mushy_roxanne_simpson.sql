ALTER TABLE "admin_access_logs" DROP CONSTRAINT "admin_access_logs_admin_id_admin_users_id_fk";
--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_access_logs" ADD CONSTRAINT "admin_access_logs_admin_id_admin_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admin_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE VIEW "public"."active_admin_users" AS (select "id", "email", "password_hash", "created_at" from "admin_users" where "admin_users"."is_deleted" = false);