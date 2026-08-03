INSERT INTO "rag_file_statuses" ("client_id", "file_path", "status")
SELECT DISTINCT "client_id", "file_path", 'indexed'::"rag_file_status"
FROM "file_embeddings"
ON CONFLICT ("client_id", "file_path") DO NOTHING;
