import { type LucideIcon, MessageSquare, Shield, Zap } from "lucide-react"

export type Feature = {
	id: string
	icon: LucideIcon
	title: string
	description: string
	color: "blue" | "green" | "purple"
}

export const getFeatures = (t: (key: string) => string): Feature[] => [
	{
		id: "speed",
		icon: Zap,
		title: t("landing.features.speedTitle"),
		description: t("landing.features.speedDescription"),
		color: "blue",
	},
	{
		id: "customizable",
		icon: Shield,
		title: t("landing.features.customizableTitle"),
		description: t("landing.features.customizableDescription"),
		color: "green",
	},
	{
		id: "embed",
		icon: MessageSquare,
		title: t("landing.features.embedTitle"),
		description: t("landing.features.embedDescription"),
		color: "purple",
	},
]
