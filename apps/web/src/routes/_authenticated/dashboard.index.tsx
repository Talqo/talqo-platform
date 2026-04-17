import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { useCurrentUser } from "@/api/hooks"
import { QuestionsAskedChart, TokenConsumptionChart } from "@/components/charts"
import { PageHeader } from "@/components/layout"
import { StatsGrid } from "@/components/stats"
import { OnboardingPopup } from "@/components/widget"
import { ADMIN_STATS, WEEKLY_STATS_DATA } from "@/data/charts"

export const Route = createFileRoute("/_authenticated/dashboard/")({
	component: AdminDashboard,
})

function AdminDashboard() {
	const { data: client, isSuccess } = useCurrentUser()
	const [showPopup, setShowPopup] = useState(false)

	useEffect(() => {
		if (isSuccess && client?.data?.widgetSetupDismissed === false) {
			setShowPopup(true)
		}
	}, [isSuccess, client])

	return (
		<div className="space-y-6">
			<PageHeader
				title="Overview"
				subtitle="Monitor your bot's usage and token consumption."
			/>

			<StatsGrid stats={ADMIN_STATS} />

			<div className="grid gap-4 md:grid-cols-2">
				<TokenConsumptionChart data={WEEKLY_STATS_DATA} />
				<QuestionsAskedChart data={WEEKLY_STATS_DATA} />
			</div>

			<OnboardingPopup open={showPopup} onOpenChange={setShowPopup} />
		</div>
	)
}
