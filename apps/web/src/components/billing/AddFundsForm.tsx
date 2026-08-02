import { zodResolver } from "@hookform/resolvers/zod"
import { useNavigate } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useAddFunds } from "@/api/hooks"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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

export function AddFundsForm() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const addFunds = useAddFunds()

	const form = useForm<AddFundsFormValues>({
		resolver: zodResolver(addFundsFormSchema),
		defaultValues: {
			amount: 0,
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
				<div className="flex flex-wrap items-center gap-2">
					<CardTitle>{t("billing.addFundsForm.title")}</CardTitle>
					<Badge variant="secondary">
						{t("billing.addFundsForm.freeDuringEarlyAccess")}
					</Badge>
				</div>
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
								t("billing.addFundsForm.addFreeCredit", {
									amount:
										amountValue > 0 ? Number(amountValue).toFixed(2) : "0.00",
								})
							)}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	)
}
