import { z } from "zod"

const PROVIDER_TYPES = [
	"openai",
	"openai_compatible",
	"google",
	"anthropic",
] as const

const providerTypeSchema = z.enum(PROVIDER_TYPES)

export type ProviderType = z.infer<typeof providerTypeSchema>

const standardProviderFields = {
	apiKey: z.string().trim().min(1).max(255),
	model: z.string().trim().min(1).max(255),
	embeddingModel: z.string().trim().min(1).max(255).optional(),
}

// Discriminated union: openai_compatible requires baseUrl
export const upsertProviderConfigBodySchema = z.discriminatedUnion(
	"providerType",
	[
		z.object({
			providerType: z.literal("openai"),
			...standardProviderFields,
		}),
		z.object({
			providerType: z.literal("openai_compatible"),
			baseUrl: z.url({ error: "baseUrl is required for openai_compatible" }),
			...standardProviderFields,
		}),
		z.object({
			providerType: z.literal("google"),
			...standardProviderFields,
		}),
		z.object({
			providerType: z.literal("anthropic"),
			...standardProviderFields,
		}),
	],
)

export type UpsertProviderConfigBody = z.infer<
	typeof upsertProviderConfigBodySchema
>

export { providerTypeSchema }
