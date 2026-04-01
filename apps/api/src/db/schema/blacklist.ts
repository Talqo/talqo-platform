import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { clients } from "./client";

export const blacklistWords = pgTable("blacklist_words", {
	id: uuid("id").primaryKey().defaultRandom(),
	clientId: uuid("client_id")
		.notNull()
		.references(() => clients.id, { onDelete: "cascade" }),
	word: varchar("word", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
