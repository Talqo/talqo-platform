import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { adminAccessLogs, adminUsers } from "../schema/admin"
import { clients } from "../schema/client"

export const adminUserResponseSchema = createSelectSchema(adminUsers, {
	email: z.string(),
	createdAt: z.string(),
	deletedAt: z.string().nullable(),
}).omit({ passwordHash: true })

// Summary projection used in admin client listing
export const clientSummarySchema = createSelectSchema(clients, {
	name: z.string(),
	email: z.string(),
	balanceUsd: z.string(),
	status: z.string(),
	lastActive: z.string().nullable(),
	createdAt: z.string(),
}).pick({
	id: true,
	name: true,
	email: true,
	balanceUsd: true,
	status: true,
	lastActive: true,
	createdAt: true,
})

export const adminAccessLogResponseSchema = createSelectSchema(
	adminAccessLogs,
	{
		actionType: z.string(),
		createdAt: z.string(),
	},
).extend({
	adminEmail: z.string(),
	clientName: z.string().nullable(),
	clientEmail: z.string().nullable(),
})

export type AdminUserResponse = z.infer<typeof adminUserResponseSchema>
export type ClientSummary = z.infer<typeof clientSummarySchema>
export type AdminAccessLogResponse = z.infer<
	typeof adminAccessLogResponseSchema
>
