import { providerTypeSchema } from "shared"
import { z } from "zod"

export const providerConfigFormSchema = z
	.object({
		providerType: providerTypeSchema,
		apiKey: z.string().trim().min(1, "API key is required").max(255),
		model: z.string().trim().min(1, "Model is required").max(255),
		baseUrl: z.string(),
	})
	.superRefine((data, ctx) => {
		if (data.providerType === "openai_compatible" && !data.baseUrl.trim()) {
			ctx.addIssue({
				code: "custom",
				message: "Base URL is required for OpenAI Compatible",
				path: ["baseUrl"],
			})
		}
	})

export type ProviderConfigFormValues = z.infer<typeof providerConfigFormSchema>
