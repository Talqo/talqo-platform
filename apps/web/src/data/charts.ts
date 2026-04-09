export interface ChartDataPoint {
	name: string;
	tokens: number;
	questions: number;
}

export const WEEKLY_STATS_DATA: ChartDataPoint[] = [
	{ name: "Mon", tokens: 4000, questions: 240 },
	{ name: "Tue", tokens: 3000, questions: 139 },
	{ name: "Wed", tokens: 2000, questions: 980 },
	{ name: "Thu", tokens: 2780, questions: 390 },
	{ name: "Fri", tokens: 1890, questions: 480 },
	{ name: "Sat", tokens: 2390, questions: 380 },
	{ name: "Sun", tokens: 3490, questions: 430 },
];

export type StatIcon = "dollar" | "zap" | "message" | "bot" | "card";

export interface StatCardData {
	title: string;
	value: string;
	subtitle: string;
	icon: StatIcon;
}

/**
 * Admin dashboard statistics data
 * Icons map to StatCard component icons
 */
export const ADMIN_STATS: StatCardData[] = [
	{
		title: "Current Balance",
		value: "$37.50",
		subtitle: "Available funds",
		icon: "dollar",
	},
	{
		title: "Total Tokens",
		value: "19,550",
		subtitle: "+20.1% from last month",
		icon: "zap",
	},
	{
		title: "Questions Answered",
		value: "3,039",
		subtitle: "+15% from last month",
		icon: "message",
	},
	{
		title: "Active Connectors",
		value: "2",
		subtitle: "Product DB, Internal Wiki",
		icon: "bot",
	},
	{
		title: "Current Spend",
		value: "$12.50",
		subtitle: "Limit: $50.00 / month",
		icon: "card",
	},
];
