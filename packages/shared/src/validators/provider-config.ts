import { z } from "zod"

const providerTypeSchema = z.enum([
	"openai",
	"openai_compatible",
	"google",
	"anthropic",
])

// Discriminated union: openai_compatible requires baseUrl
export const upsertProviderConfigBodySchema = z.discriminatedUnion(
	"providerType",
	[
		z.object({
			providerType: z.literal("openai"),
			apiKey: z.string().min(1),
			model: z.string().min(1),
			baseUrl: z.string().url().optional(),
		}),
		z.object({
			providerType: z.literal("openai_compatible"),
			apiKey: z.string().min(1),
			model: z.string().min(1),
			baseUrl: z.string().url("baseUrl is required for openai_compatible"),
		}),
		z.object({
			providerType: z.literal("google"),
			apiKey: z.string().min(1),
			model: z.string().min(1),
			baseUrl: z.string().url().optional(),
		}),
		z.object({
			providerType: z.literal("anthropic"),
			apiKey: z.string().min(1),
			model: z.string().min(1),
			baseUrl: z.string().url().optional(),
		}),
	],
)

export type UpsertProviderConfigBody = z.infer<
	typeof upsertProviderConfigBodySchema
>

export { providerTypeSchema }
