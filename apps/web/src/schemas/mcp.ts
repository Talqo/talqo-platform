import { z } from "zod"

export const mcpServerConfigSchema = z
	.object({
		type: z.enum(["sse", "http"]),
		url: z.string().optional(),
	})
	.superRefine((data, ctx) => {
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
	})

export type McpServerConfigFormValues = z.infer<typeof mcpServerConfigSchema>
