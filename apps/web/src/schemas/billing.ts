import { addFundsBodySchema } from "shared"
import { z } from "zod"

export const addFundsFormSchema = addFundsBodySchema.extend({
	cardNumber: z
		.string()
		.regex(/^\d{4} \d{4} \d{4} \d{4}$/, "Invalid card number"),
	expiry: z.string().regex(/^\d{2}\/\d{2}$/, "Invalid expiry (MM/YY)"),
	cvv: z.string().regex(/^\d{3}$/, "Invalid CVV"),
	nameOnCard: z.string().min(1, "Name is required"),
})

export type AddFundsFormValues = z.infer<typeof addFundsFormSchema>
