import { z } from "zod"

const providerTypeSchema = z.enum([
	"openai",
	"openai_compatible",
	"google",
	"anthropic",
])

const apiKeySchema = z.string().trim().min(1).max(255)
const modelSchema = z.string().trim().min(1).max(255)

// Discriminated union: openai_compatible requires baseUrl
export const upsertProviderConfigBodySchema = z.discriminatedUnion(
	"providerType",
	[
		z.object({
			providerType: z.literal("openai"),
			apiKey: apiKeySchema,
			model: modelSchema,
			baseUrl: z.url().optional(),
		}),
		z.object({
			providerType: z.literal("openai_compatible"),
			apiKey: apiKeySchema,
			model: modelSchema,
			baseUrl: z.url({ error: "baseUrl is required for openai_compatible" }),
		}),
		z.object({
			providerType: z.literal("google"),
			apiKey: apiKeySchema,
			model: modelSchema,
			baseUrl: z.url().optional(),
		}),
		z.object({
			providerType: z.literal("anthropic"),
			apiKey: apiKeySchema,
			model: modelSchema,
			baseUrl: z.url().optional(),
		}),
	],
)

export type UpsertProviderConfigBody = z.infer<
	typeof upsertProviderConfigBodySchema
>

export { providerTypeSchema }
