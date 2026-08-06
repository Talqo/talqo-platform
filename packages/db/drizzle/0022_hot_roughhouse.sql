CREATE TYPE "public"."rag_file_error_code" AS ENUM('insufficient_balance', 'provider_error', 'indexing_error');--> statement-breakpoint
CREATE TYPE "public"."rag_file_status" AS ENUM('indexed', 'stale', 'failed');--> statement-breakpoint
CREATE TABLE "embedding_usage_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"tokens_used" integer NOT NULL,
	"cost_usd" numeric(16, 8) NOT NULL,
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
CREATE TABLE "rag_file_statuses" (
	"client_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"status" "rag_file_status" NOT NULL,
	"error_code" "rag_file_error_code",
	CONSTRAINT "rag_file_statuses_client_id_file_path_pk" PRIMARY KEY("client_id","file_path")
);
--> statement-breakpoint
CREATE TABLE "rag_operation_locks" (
	"key" text PRIMARY KEY NOT NULL,
	"token" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "embedding_usage_reservations" ADD CONSTRAINT "embedding_usage_reservations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_file_index_rate_limits" ADD CONSTRAINT "rag_file_index_rate_limits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rag_file_statuses" ADD CONSTRAINT "rag_file_statuses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_embedding_reservations_expiry" ON "embedding_usage_reservations" USING btree ("expires_at");--> statement-breakpoint
DO $$
DECLARE
	inserted_count integer;
BEGIN
	LOOP
		WITH batch AS (
			SELECT "client_id", "file_path"
			FROM "file_embeddings"
			WHERE NOT EXISTS (
				SELECT 1 FROM "rag_file_statuses"
				WHERE "rag_file_statuses"."client_id" = "file_embeddings"."client_id"
					AND "rag_file_statuses"."file_path" = "file_embeddings"."file_path"
			)
			GROUP BY "client_id", "file_path"
			LIMIT 1000
		), inserted AS (
			INSERT INTO "rag_file_statuses" ("client_id", "file_path", "status")
			SELECT "client_id", "file_path", 'indexed'::"rag_file_status" FROM batch
			ON CONFLICT ("client_id", "file_path") DO NOTHING
			RETURNING 1
		)
		SELECT count(*) INTO inserted_count FROM inserted;
		EXIT WHEN inserted_count = 0;
	END LOOP;
END $$;
