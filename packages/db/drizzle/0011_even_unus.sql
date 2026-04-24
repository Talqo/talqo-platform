ALTER TABLE "admin_access_logs" ALTER COLUMN "client_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "admin_access_logs" DROP CONSTRAINT "admin_access_logs_client_id_clients_id_fk";
--> statement-breakpoint
ALTER TABLE "admin_access_logs" ADD CONSTRAINT "admin_access_logs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE NO ACTION;