CREATE INDEX "conversations_client_id_idx" ON "conversations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "usage_records_client_id_idx" ON "usage_records" USING btree ("client_id");--> statement-breakpoint
ALTER TABLE "blacklist_words" ADD CONSTRAINT "blacklist_words_client_id_word_unique" UNIQUE("client_id","word");