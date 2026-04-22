import { eq } from "drizzle-orm"
import {
	boolean,
	pgTable,
	pgView,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core"
import { clients } from "./client"

export const adminUsers = pgTable("admin_users", {
	id: uuid("id").primaryKey().defaultRandom(),
	email: varchar("email", { length: 255 }).notNull().unique(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	isDeleted: boolean("is_deleted").default(false).notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
})

export const activeAdminUsers = pgView("active_admin_users").as((qb) =>
	qb
		.select({
			id: adminUsers.id,
			email: adminUsers.email,
			passwordHash: adminUsers.passwordHash,
			createdAt: adminUsers.createdAt,
		})
		.from(adminUsers)
		.where(eq(adminUsers.isDeleted, false)),
)

export const adminAccessLogs = pgTable("admin_access_logs", {
	id: uuid("id").primaryKey().defaultRandom(),
	adminId: uuid("admin_id")
		.notNull()
		.references(() => adminUsers.id, { onDelete: "restrict" }),
	clientId: uuid("client_id").references(() => clients.id, {
		onDelete: "set null",
	}),
	actionType: varchar("action_type", { length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
})
