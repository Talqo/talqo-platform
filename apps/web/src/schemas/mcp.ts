import { mcpUrlField } from "shared"
import { z } from "zod"

export const kvPairSchema = z.object({
	key: z.string().trim().min(1, { message: "Key is required" }),
	value: z.string(),
})

export type KvPair = z.infer<typeof kvPairSchema>

export const mcpConfigFormSchema = z.object({
	url: mcpUrlField,
	headers: z.array(kvPairSchema).optional(),
})

export type McpConfigFormValues = z.infer<typeof mcpConfigFormSchema>

export const mcpDialogSchema = z.discriminatedUnion("type", [
	z.object({
		name: z.string().trim().min(1, { message: "Name is required" }),
		description: z.string().optional(),
		type: z.literal("http"),
		url: mcpUrlField,
		headers: z.array(kvPairSchema).optional(),
	}),
	z.object({
		name: z.string().trim().min(1, { message: "Name is required" }),
		description: z.string().optional(),
		type: z.literal("stdio"),
		command: z.string().trim().min(1, { message: "Command is required" }),
		args: z.array(z.object({ value: z.string() })).optional(),
		env: z.array(kvPairSchema).optional(),
	}),
])

export type McpDialogFormValues = z.infer<typeof mcpDialogSchema>
