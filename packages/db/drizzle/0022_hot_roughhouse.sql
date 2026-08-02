CREATE TYPE "public"."rag_file_error_code" AS ENUM('insufficient_balance', 'provider_error');--> statement-breakpoint
CREATE TYPE "public"."rag_file_status" AS ENUM('indexed', 'failed');--> statement-breakpoint
CREATE TABLE "rag_file_statuses" (
	"client_id" uuid NOT NULL,
	"file_path" text NOT NULL,
	"status" "rag_file_status" NOT NULL,
	"error_code" "rag_file_error_code",
	CONSTRAINT "rag_file_statuses_client_id_file_path_pk" PRIMARY KEY("client_id","file_path")
);
--> statement-breakpoint
ALTER TABLE "rag_file_statuses" ADD CONSTRAINT "rag_file_statuses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;