import type { LucideIcon } from "lucide-react"
import { AlertCircle, BarChart3, CheckCircle2, Users } from "lucide-react"

export type Stat = {
	id: string
	title: string
	value: string
	subtitle: string
	icon: LucideIcon
	variant?: "default" | "success"
}

export type ClientEntry = {
	id: string
	name: string
	status: "active" | "suspended"
	aiProvider: string
	tokenUsage: string
}

export const STATS: Stat[] = [
	{
		id: "clients",
		title: "Total Active Clients",
		value: "142",
		subtitle: "+12 this week",
		icon: Users,
	},
	{
		id: "tokens",
		title: "Platform Tokens",
		value: "1.2M",
		subtitle: "Last 30 days",
		icon: BarChart3,
	},
	{
		id: "api",
		title: "OpenAI API",
		value: "Operational",
		subtitle: "Avg response: 1.2s",
		icon: CheckCircle2,
		variant: "success",
	},
	{
		id: "errors",
		title: "Error Rate",
		value: "0.05%",
		subtitle: "Within normal limits",
		icon: AlertCircle,
	},
]

export const CLIENTS: ClientEntry[] = [
	{
		id: "acme",
		name: "Acme Corp",
		status: "active",
		aiProvider: "Platform Default",
		tokenUsage: "120K / 500K",
	},
	{
		id: "globex",
		name: "Globex Inc",
		status: "suspended",
		aiProvider: "OpenAI",
		tokenUsage: "0 / 0",
	},
]
