import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useAddFunds } from "@/api/hooks"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { type AddFundsFormValues, addFundsFormSchema } from "@/schemas/billing"

function formatCardNumber(value: string) {
	return value
		.replace(/\D/g, "")
		.slice(0, 16)
		.replace(/(.{4})/g, "$1 ")
		.trim()
}

function formatExpiry(value: string) {
	const digits = value.replace(/\D/g, "").slice(0, 4)
	if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
	return digits
}

export function AddFundsForm() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const addFunds = useAddFunds()

	const form = useForm<AddFundsFormValues>({
		resolver: zodResolver(addFundsFormSchema),
		defaultValues: {
			amount: 0,
			cardNumber: "",
			expiry: "",
			cvv: "",
			nameOnCard: "",
		},
		mode: "onBlur",
	})

	const onSubmit = (values: AddFundsFormValues) => {
		addFunds.mutate(
			{ amount: values.amount },
			{
				onSuccess: () => {
					setTimeout(() => navigate({ to: "/dashboard" }), 1500)
				},
			},
		)
	}

	const amountValue = form.watch("amount")

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<CardTitle>{t("billing.addFundsForm.title")}</CardTitle>
				<CardDescription>
					{t("billing.addFundsForm.description")}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="amount"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("billing.addFundsForm.amountUsd")}</FormLabel>
									<FormControl>
										<div className="relative">
											<span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
												$
											</span>
											<Input
												type="number"
												min="0.01"
												step="0.01"
												placeholder="0.00"
												className="pl-7"
												{...field}
												onChange={(e) =>
													field.onChange(e.target.valueAsNumber || 0)
												}
											/>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="cardNumber"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("cardNumber")}</FormLabel>
									<FormControl>
										<Input
											inputMode="numeric"
											placeholder={t(
												"billing.addFundsForm.cardNumberPlaceholder",
											)}
											autoComplete="cc-number"
											value={field.value}
											onBlur={field.onBlur}
											onChange={(e) =>
												field.onChange(formatCardNumber(e.target.value))
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="expiry"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("expiry")}</FormLabel>
										<FormControl>
											<Input
												inputMode="numeric"
												placeholder={t(
													"billing.addFundsForm.expiryPlaceholder",
												)}
												autoComplete="cc-exp"
												value={field.value}
												onBlur={field.onBlur}
												onChange={(e) =>
													field.onChange(formatExpiry(e.target.value))
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="cvv"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("cvv")}</FormLabel>
										<FormControl>
											<Input
												inputMode="numeric"
												placeholder={t("billing.addFundsForm.cvvPlaceholder")}
												maxLength={3}
												autoComplete="cc-csc"
												{...field}
												onChange={(e) =>
													field.onChange(
														e.target.value.replace(/\D/g, "").slice(0, 3),
													)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="nameOnCard"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("nameOnCard")}</FormLabel>
									<FormControl>
										<Input
											placeholder={t(
												"billing.addFundsForm.nameOnCardPlaceholder",
											)}
											autoComplete="cc-name"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{addFunds.isError && (
							<Alert variant="destructive">
								<AlertDescription>
									{t("billing.addFundsForm.failedToAddFunds")}
								</AlertDescription>
							</Alert>
						)}

						{addFunds.isSuccess && (
							<Alert>
								<AlertDescription>
									{t("billing.addFundsForm.fundsAddedSuccess")}
								</AlertDescription>
							</Alert>
						)}

						<Button
							type="submit"
							className="w-full"
							disabled={addFunds.isPending}
						>
							{addFunds.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									{t("billing.addFundsForm.processing")}
								</>
							) : (
								`${t("billing.addFundsForm.pay")} $${amountValue > 0 ? Number(amountValue).toFixed(2) : "0.00"}`
							)}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	)
}
