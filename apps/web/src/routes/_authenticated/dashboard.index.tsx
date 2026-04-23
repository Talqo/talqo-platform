import { createFileRoute, Link } from "@tanstack/react-router"
import { PlusCircle } from "lucide-react"
import { useEffect, useState } from "react"
import {
	useClientAnalyticsSummary,
	useClientProfile,
	useCurrentUser,
	useMessageAnalytics,
	useTokenAnalytics,
} from "@/api/hooks"
import { QuestionsAskedChart, TokenConsumptionChart } from "@/components/charts"
import { PageHeader } from "@/components/layout"
import { StatCard } from "@/components/stats/StatCard"
import { OnboardingPopup } from "@/components/widget"
import type { ChartDataPoint } from "@/data/charts"

export const Route = createFileRoute("/_authenticated/dashboard/")({
	component: AdminDashboard,
})

function formatPeriod(period: string): string {
	return new Date(period).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	})
}

function AdminDashboard() {
	const { data: profile } = useClientProfile()
	const { data: currentUser, isSuccess } = useCurrentUser()
	const [showPopup, setShowPopup] = useState(false)

	const { data: tokenData } = useTokenAnalytics()
	const { data: messageData } = useMessageAnalytics()
	const { data: summary } = useClientAnalyticsSummary()

	useEffect(() => {
		if (isSuccess && currentUser?.widgetSetupDismissed === false) {
			setShowPopup(true)
		}
	}, [isSuccess, currentUser])

	const balanceRaw = Number(profile?.balanceUsd)
	const balanceValue = Number.isFinite(balanceRaw)
		? `$${balanceRaw.toFixed(2)}`
		: "$0.00"

	const tokenChartData: ChartDataPoint[] = (tokenData ?? []).map((d) => ({
		name: formatPeriod(d.period),
		tokens: d.tokensUsed,
		questions: 0,
	}))

	const messageChartData: ChartDataPoint[] = (messageData ?? []).map((d) => ({
		name: formatPeriod(d.period),
		tokens: 0,
		questions: d.messageCount,
	}))

	const totalTokens = summary ? summary.totalTokens.toLocaleString() : "—"
	const totalMessages = summary
		? summary.totalUserMessages.toLocaleString()
		: "—"
	const totalConversations = summary
		? summary.totalConversations.toLocaleString()
		: "—"
	const uniqueUsers = summary ? summary.uniqueUsers.toLocaleString() : "—"
	const avgRating =
		summary?.avgSatisfactionRating != null
			? `${summary.avgSatisfactionRating.toFixed(1)} / 5`
			: "No data"
	const visitorEngagement =
		summary && summary.totalPageviewSessions > 0
			? `${((summary.uniqueUsers / summary.totalPageviewSessions) * 100).toFixed(1)}%`
			: "No data"

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
					value={totalTokens}
					subtitle="All time"
					icon="zap"
				/>
				<StatCard
					title="Questions Answered"
					value={totalMessages}
					subtitle="All time"
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

			<div className="grid gap-4 md:grid-cols-4">
				<StatCard
					title="Total Conversations"
					value={totalConversations}
					subtitle="All time"
					icon="message"
				/>
				<StatCard
					title="Unique Users"
					value={uniqueUsers}
					subtitle="Browser sessions"
					icon="bot"
				/>
				<StatCard
					title="Visitor Engagement"
					value={visitorEngagement}
					subtitle="Site visitors who chatted"
					icon="bot"
				/>
				<StatCard
					title="Avg Satisfaction"
					value={avgRating}
					subtitle="Satisfaction rating (1–5)"
					icon="zap"
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<TokenConsumptionChart data={tokenChartData} />
				<QuestionsAskedChart data={messageChartData} />
			</div>

			<OnboardingPopup open={showPopup} onOpenChange={setShowPopup} />
		</div>
	)
}
