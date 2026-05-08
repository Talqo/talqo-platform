import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { type BillingSettingsInput, billingSettingsSchema } from "shared"
import {
	useSetUsageAlert,
	useSetUsageLimit,
} from "@/api/hooks/useClientAccount"
import upgradeImage from "@/assets/Gemini_Generated_Image_7dq4tr7dq4tr7dq4.png"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardFooter,
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
import { Switch } from "@/components/ui/switch"

export function BillingSettingsTab() {
	const { t } = useTranslation()
	const setUsageLimit = useSetUsageLimit()
	const setUsageAlert = useSetUsageAlert()

	const form = useForm<BillingSettingsInput>({
		resolver: zodResolver(billingSettingsSchema),
		defaultValues: { monthlyLimit: 50, usageAlerts: true },
		mode: "onBlur",
	})

	const onSubmit = (values: BillingSettingsInput) => {
		setUsageLimit.mutate({ limit: values.monthlyLimit })
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("settings.billing.title")}</CardTitle>
			</CardHeader>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<CardContent className="space-y-4">
						<FormField
							control={form.control}
							name="monthlyLimit"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("settings.billing.monthlyLimit")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											value={field.value ?? ""}
											onBlur={field.onBlur}
											onChange={(e) => {
												const val = e.target.valueAsNumber
												field.onChange(Number.isNaN(val) ? 0 : val)
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="usageAlerts"
							render={({ field }) => (
								<FormItem className="flex items-center justify-between space-x-2 pt-2">
									<div>
										<FormLabel>{t("settings.billing.usageAlerts")}</FormLabel>
										<p className="text-muted-foreground text-sm">
											{t("settings.billing.usageAlertsDescription")}
										</p>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={(checked) => {
												field.onChange(checked)
												setUsageAlert.mutate({
													thresholdUsd: checked ? 40 : null,
												})
											}}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						<p className="text-muted-foreground text-sm">
							{t("settings.billing.ownApiKeyPrompt")}{" "}
							<Link
								to="/dashboard/settings"
								search={{ tab: "ai-provider" }}
								className="text-foreground underline underline-offset-2 hover:text-primary"
							>
								{t("settings.billing.configureProvider")}
							</Link>
						</p>
					</CardContent>
					<CardFooter className="flex justify-between">
						<Link
							to="/dashboard/add-funds"
							className="relative h-16 overflow-hidden rounded-md border-2 border-primary transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
						>
							<img
								src={upgradeImage}
								alt={t("settings.billing.upgradePlan")}
								className="h-full w-auto object-contain"
							/>
						</Link>
						<Button type="submit" disabled={setUsageLimit.isPending}>
							{setUsageLimit.isPending
								? t("settings.billing.saving")
								: t("settings.billing.saveSettings")}
						</Button>
					</CardFooter>
				</form>
			</Form>
		</Card>
	)
}
