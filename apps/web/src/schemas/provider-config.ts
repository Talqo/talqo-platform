import { providerTypeSchema } from "shared"
import { z } from "zod"

export const createProviderConfigFormSchema = (t: (key: string) => string) =>
	z
		.object({
			providerType: providerTypeSchema,
			apiKey: z
				.string()
				.trim()
				.min(1, t("settings.provider.apiKeyRequired"))
				.max(255),
			model: z
				.string()
				.trim()
				.min(1, t("settings.provider.modelRequired"))
				.max(255),
			baseUrl: z.string(),
		})
		.superRefine((data, ctx) => {
			if (data.providerType === "openai_compatible" && !data.baseUrl.trim()) {
				ctx.addIssue({
					code: "custom",
					message: t("settings.provider.baseUrlRequiredError"),
					path: ["baseUrl"],
				})
			}
		})

export const providerConfigFormSchema = createProviderConfigFormSchema(() => "")
export type ProviderConfigFormValues = z.infer<typeof providerConfigFormSchema>
