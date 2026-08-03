ALTER TYPE "public"."rag_file_error_code" ADD VALUE 'indexing_error';--> statement-breakpoint
CREATE TABLE "embedding_usage_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"tokens_used" integer NOT NULL,
	"cost_usd" numeric(16, 8) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rag_client_operation_locks" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"token" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rag_file_index_rate_limits" (
	"client_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rag_file_index_rate_limits_client_id_file_path_pk" PRIMARY KEY("client_id","file_path")
);
--> statement-breakpoint
ALTER TABLE "embedding_usage_reservations" ADD CONSTRAINT "embedding_usage_reservations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_client_operation_locks" ADD CONSTRAINT "rag_client_operation_locks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_file_index_rate_limits" ADD CONSTRAINT "rag_file_index_rate_limits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_embedding_reservations_expiry" ON "embedding_usage_reservations" USING btree ("expires_at");