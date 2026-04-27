import { z } from "zod"

export const mcpServerConfigSchema = z
	.object({
		type: z.enum(["sse", "http", "stdio"]),
		url: z.string().optional(),
		command: z.string().optional(),
		args: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.type === "sse" || data.type === "http") {
			if (!data.url?.trim()) {
				ctx.addIssue({
					code: "custom",
					message: "URL is required",
					path: ["url"],
				})
			} else {
				try {
					new URL(data.url)
				} catch {
					ctx.addIssue({
						code: "custom",
						message: "Must be a valid URL",
						path: ["url"],
					})
				}
			}
		}
		if (data.type === "stdio" && !data.command?.trim()) {
			ctx.addIssue({
				code: "custom",
				message: "Command is required",
				path: ["command"],
			})
		}
	})

export type McpServerConfigFormValues = z.infer<typeof mcpServerConfigSchema>
