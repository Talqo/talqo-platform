import { createFileRoute, Link } from "@tanstack/react-router"
import { PlusCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
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
		timeZone: "UTC",
	})
}

function AdminDashboard() {
	const { t } = useTranslation()
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
			: t("dashboard.overview.noData")
	const visitorEngagement =
		summary && summary.totalPageviewSessions > 0
			? `${((summary.uniqueUsers / summary.totalPageviewSessions) * 100).toFixed(1)}%`
			: t("dashboard.overview.noData")

	const currentSpendRaw = Number(summary?.last30DaysSpendUsd)
	const currentSpendValue =
		summary && Number.isFinite(currentSpendRaw)
			? `$${currentSpendRaw.toFixed(2)}`
			: "—"
	const currentSpendSubtitle = t("dashboard.overview.last30Days")

	return (
		<div className="space-y-6">
			<PageHeader
				title={t("dashboard.overview.title")}
				subtitle={t("dashboard.overview.subtitle")}
			/>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<StatCard
					title={t("dashboard.overview.currentBalance")}
					value={balanceValue}
					subtitle={t("dashboard.overview.availableFunds")}
					icon="dollar"
					action={
						<Link
							to="/dashboard/add-funds"
							aria-label={t("dashboard.overview.addFunds")}
							className="flex items-center text-muted-foreground transition-colors hover:text-primary"
						>
							<PlusCircle size={18} />
						</Link>
					}
				/>
				<StatCard
					title={t("dashboard.overview.currentSpend")}
					value={currentSpendValue}
					subtitle={currentSpendSubtitle}
					icon="card"
				/>
				<StatCard
					title={t("dashboard.overview.totalTokens")}
					value={totalTokens}
					subtitle={t("dashboard.overview.allTime")}
					icon="zap"
				/>
				<StatCard
					title={t("dashboard.overview.questionsAnswered")}
					value={totalMessages}
					subtitle={t("dashboard.overview.allTime")}
					icon="message"
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-4">
				<StatCard
					title={t("dashboard.overview.totalConversations")}
					value={totalConversations}
					subtitle={t("dashboard.overview.allTime")}
					icon="message"
				/>
				<StatCard
					title={t("dashboard.overview.uniqueUsers")}
					value={uniqueUsers}
					subtitle={t("dashboard.overview.sessionsThatChatted")}
					icon="bot"
				/>
				<StatCard
					title={t("dashboard.overview.visitorEngagement")}
					value={visitorEngagement}
					subtitle={t("dashboard.overview.siteVisitorsWhoChatted")}
					icon="bot"
				/>
				<StatCard
					title={t("dashboard.overview.avgSatisfaction")}
					value={avgRating}
					subtitle={t("dashboard.overview.satisfactionRating")}
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
