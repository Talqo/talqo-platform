DROP INDEX "usage_records_client_id_idx";--> statement-breakpoint
CREATE INDEX "usage_records_client_id_recorded_at_idx" ON "usage_records" USING btree ("client_id","recorded_at");