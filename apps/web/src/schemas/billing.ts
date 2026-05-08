import { addFundsBodySchema } from "shared"
import { z } from "zod"

export const createAddFundsFormSchema = (t: (key: string) => string) =>
	addFundsBodySchema.extend({
		cardNumber: z
			.string()
			.regex(
				/^\d{4} \d{4} \d{4} \d{4}$/,
				t("billing.addFundsForm.invalidCardNumber"),
			),
		expiry: z
			.string()
			.regex(/^\d{2}\/\d{2}$/, t("billing.addFundsForm.invalidExpiry")),
		cvv: z.string().regex(/^\d{3}$/, t("billing.addFundsForm.invalidCvv")),
		nameOnCard: z.string().min(1, t("billing.addFundsForm.nameRequired")),
	})

export const addFundsFormSchema = createAddFundsFormSchema(() => "")
export type AddFundsFormValues = z.infer<typeof addFundsFormSchema>
