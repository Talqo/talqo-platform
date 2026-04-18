import { createFileRoute, Link } from "@tanstack/react-router"
import { PlusCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useClientProfile, useCurrentUser } from "@/api/hooks"
import { QuestionsAskedChart, TokenConsumptionChart } from "@/components/charts"
import { PageHeader } from "@/components/layout"
import { StatCard } from "@/components/stats/StatCard"
import { OnboardingPopup } from "@/components/widget"
import { WEEKLY_STATS_DATA } from "@/data/charts"

export const Route = createFileRoute("/_authenticated/dashboard/")({
	component: AdminDashboard,
})

function AdminDashboard() {
	const { data: profile } = useClientProfile()
	const { data: client, isSuccess } = useCurrentUser()
	const [showPopup, setShowPopup] = useState(false)

	useEffect(() => {
		if (isSuccess && client?.data?.widgetSetupDismissed === false) {
			setShowPopup(true)
		}
	}, [isSuccess, client])

	const balanceRaw = Number(profile?.balanceUsd)
	const balanceValue = Number.isFinite(balanceRaw)
		? `$${balanceRaw.toFixed(2)}`
		: "$0.00"

	return (
		<div className="space-y-6">
			<PageHeader
				title="Overview"
				subtitle="Monitor your bot's usage and token consumption."
			/>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
				<StatCard
					title="Current Balance"
					value={balanceValue}
					subtitle="Available funds"
					icon="dollar"
					action={
						<Link
							to="/dashboard/add-funds"
							aria-label="Add funds"
							className="flex items-center text-muted-foreground transition-colors hover:text-primary"
						>
							<PlusCircle size={18} />
						</Link>
					}
				/>
				<StatCard
					title="Total Tokens"
					value="19,550"
					subtitle="+20.1% from last month"
					icon="zap"
				/>
				<StatCard
					title="Questions Answered"
					value="3,039"
					subtitle="+15% from last month"
					icon="message"
				/>
				<StatCard
					title="Active Connectors"
					value="2"
					subtitle="Product DB, Internal Wiki"
					icon="bot"
				/>
				<StatCard
					title="Current Spend"
					value="$12.50"
					subtitle="Limit: $50.00 / month"
					icon="card"
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<TokenConsumptionChart data={WEEKLY_STATS_DATA} />
				<QuestionsAskedChart data={WEEKLY_STATS_DATA} />
			</div>

			<OnboardingPopup open={showPopup} onOpenChange={setShowPopup} />
		</div>
	)
}
