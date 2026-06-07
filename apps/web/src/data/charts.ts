export type ChartDataPoint = {
	name: string
	tokens: number
	questions: number
}

export const getWeeklyStatsData = (
	t: (key: string) => string,
): ChartDataPoint[] => [
	{ name: t("charts.dayNames.mon"), tokens: 4000, questions: 240 },
	{ name: t("charts.dayNames.tue"), tokens: 3000, questions: 139 },
	{ name: t("charts.dayNames.wed"), tokens: 2000, questions: 980 },
	{ name: t("charts.dayNames.thu"), tokens: 2780, questions: 390 },
	{ name: t("charts.dayNames.fri"), tokens: 1890, questions: 480 },
	{ name: t("charts.dayNames.sat"), tokens: 2390, questions: 380 },
	{ name: t("charts.dayNames.sun"), tokens: 3490, questions: 430 },
]

export type StatIcon = "dollar" | "zap" | "message" | "bot" | "card"

export type StatCardData = {
	title: string
	value: string
	subtitle: string
	icon: StatIcon
}

/**
 * Admin dashboard statistics data
 * Icons map to StatCard component icons
 */
export const getAdminStats = (t: (key: string) => string): StatCardData[] => [
	{
		title: t("adminStats.currentBalance"),
		value: "$37.50",
		subtitle: t("adminStats.availableFunds"),
		icon: "dollar",
	},
	{
		title: t("adminStats.totalTokens"),
		value: "19,550",
		subtitle: t("adminStats.tokensChange"),
		icon: "zap",
	},
	{
		title: t("adminStats.questionsAnswered"),
		value: "3,039",
		subtitle: t("adminStats.questionsChange"),
		icon: "message",
	},
	{
		title: t("adminStats.activeConnectors"),
		value: "2",
		subtitle: t("adminStats.connectorsSubtitle"),
		icon: "bot",
	},
	{
		title: t("adminStats.currentSpend"),
		value: "$12.50",
		subtitle: t("adminStats.spendSubtitle"),
		icon: "card",
	},
]
