import { zodResolver } from "@hookform/resolvers/zod"
import { Link } from "@tanstack/react-router"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { type BillingSettingsInput, billingSettingsSchema } from "shared"
import {
	useClientProfile,
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
	const { data: profile } = useClientProfile()
	const setUsageLimit = useSetUsageLimit()
	const setUsageAlert = useSetUsageAlert()

	const form = useForm<BillingSettingsInput>({
		resolver: zodResolver(billingSettingsSchema),
		defaultValues: { monthlyLimit: 50, usageAlerts: false },
		mode: "onBlur",
	})

	useEffect(() => {
		if (profile) {
			form.reset(
				{
					monthlyLimit: profile.monthlyUsageLimit
						? parseFloat(profile.monthlyUsageLimit)
						: 50,
					usageAlerts: profile.usageAlertThresholdUsd !== null,
				},
				{ keepDirtyValues: true },
			)
		}
	}, [profile, form])

	const onSubmit = (values: BillingSettingsInput) => {
		setUsageLimit.mutate({ limit: values.monthlyLimit })
		setUsageAlert.mutate({
			thresholdUsd: values.usageAlerts ? values.monthlyLimit * 0.8 : null,
		})
	}

	const isPending = setUsageLimit.isPending || setUsageAlert.isPending

	return (
		<Card>
			<CardHeader>
				<CardTitle>Usage & Limits</CardTitle>
			</CardHeader>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)}>
					<CardContent className="space-y-4">
						<FormField
							control={form.control}
							name="monthlyLimit"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Monthly Limit (USD)</FormLabel>
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
										<FormLabel>Usage Alerts</FormLabel>
										<p className="text-muted-foreground text-sm">
											Email me when reaching 80% of limit
										</p>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						<p className="text-muted-foreground text-sm">
							Want to use your own API key instead?{" "}
							<Link
								to="/dashboard/settings"
								search={{ tab: "ai-provider" }}
								className="text-foreground underline underline-offset-2 hover:text-primary"
							>
								Configure it in the AI Provider tab.
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
								alt="Upgrade plan"
								className="h-full w-auto object-contain"
							/>
						</Link>
						<Button type="submit" disabled={isPending}>
							{isPending ? "Saving..." : "Save Settings"}
						</Button>
					</CardFooter>
				</form>
			</Form>
		</Card>
	)
}
