CREATE TABLE "widget_ip_rate_limits" (
	"ip" varchar(45) NOT NULL,
	"window" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "widget_ip_rate_limits_ip_window_pk" PRIMARY KEY("ip","window")
);
--> statement-breakpoint
CREATE INDEX "widget_ip_rate_limits_window_idx" ON "widget_ip_rate_limits" USING btree ("window");--> statement-breakpoint
CREATE INDEX CONCURRENTLY "messages_conversation_id_created_at_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
ALTER TABLE "end_user_sessions" ADD CONSTRAINT "end_user_sessions_client_id_browser_session_id_unique" UNIQUE("client_id","browser_session_id");