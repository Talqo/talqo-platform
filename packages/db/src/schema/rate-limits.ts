import {
	index,
	integer,
	pgTable,
	primaryKey,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core"

export const widgetIpRateLimits = pgTable(
	"widget_ip_rate_limits",
	{
		ip: varchar("ip", { length: 45 }).notNull(),
		window: timestamp("window", { withTimezone: true }).notNull(),
		count: integer("count").notNull().default(0),
	},
	(table) => [
		primaryKey({ columns: [table.ip, table.window] }),
		index("widget_ip_rate_limits_window_idx").on(table.window),
	],
)
