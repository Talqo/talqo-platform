CREATE TABLE "file_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"embedding" vector,
	"embedding_dimensions" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usage_records" ALTER COLUMN "message_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_provider_configs" ADD COLUMN "embedding_model" varchar(255);--> statement-breakpoint
ALTER TABLE "usage_records" ADD COLUMN "type" varchar(32) DEFAULT 'message' NOT NULL;--> statement-breakpoint
ALTER TABLE "file_embeddings" ADD CONSTRAINT "file_embeddings_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_client_file_chunk" ON "file_embeddings" USING btree ("client_id","file_path","chunk_index");--> statement-breakpoint
CREATE INDEX "idx_file_embeddings_client_id" ON "file_embeddings" USING btree ("client_id");