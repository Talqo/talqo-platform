import {
	BarChart3,
	Boxes,
	BrainCircuit,
	Brush,
	CalendarClock,
	Code2,
	type LucideIcon,
	PlugZap,
	Rocket,
	Settings2,
	ShieldCheck,
	ShoppingBag,
	TerminalSquare,
} from "lucide-react"

export type LandingStep = {
	id: string
	icon: LucideIcon
	label: string
	description: string
}

export type UseCase = {
	id: string
	icon: LucideIcon
	label: string
	question: string
	answer: string
	accent: string
}

export type Capability = {
	id: string
	icon: LucideIcon
	label: string
}

export const getLandingSteps = (t: (key: string) => string): LandingStep[] => [
	{
		id: "configure",
		icon: Settings2,
		label: t("landing.steps.configure"),
		description: t("landing.steps.configureDescription"),
	},
	{
		id: "paste",
		icon: Code2,
		label: t("landing.steps.paste"),
		description: t("landing.steps.pasteDescription"),
	},
	{
		id: "launch",
		icon: Rocket,
		label: t("landing.steps.launch"),
		description: t("landing.steps.launchDescription"),
	},
]

export const getUseCases = (t: (key: string) => string): UseCase[] => [
	{
		id: "shop",
		icon: ShoppingBag,
		label: t("landing.useCases.shop.label"),
		question: t("landing.useCases.shop.question"),
		answer: t("landing.useCases.shop.answer"),
		accent: "bg-[#f7c948] text-[#201200] dark:bg-[#9f6b00] dark:text-[#fff7d6]",
	},
	{
		id: "saas",
		icon: TerminalSquare,
		label: t("landing.useCases.saas.label"),
		question: t("landing.useCases.saas.question"),
		answer: t("landing.useCases.saas.answer"),
		accent: "bg-[#9ddcff] text-[#061923] dark:bg-[#075985] dark:text-[#e0f7ff]",
	},
	{
		id: "services",
		icon: CalendarClock,
		label: t("landing.useCases.services.label"),
		question: t("landing.useCases.services.question"),
		answer: t("landing.useCases.services.answer"),
		accent: "bg-[#f6b6c8] text-[#2a0711] dark:bg-[#9f1239] dark:text-[#ffe4ec]",
	},
]

export const getCapabilities = (t: (key: string) => string): Capability[] => [
	{
		id: "knowledge",
		icon: BrainCircuit,
		label: t("landing.capabilities.knowledgeBase"),
	},
	{
		id: "mcp",
		icon: PlugZap,
		label: t("landing.capabilities.mcpTools"),
	},
	{
		id: "brand",
		icon: Brush,
		label: t("landing.capabilities.brandColors"),
	},
	{
		id: "limits",
		icon: ShieldCheck,
		label: t("landing.capabilities.rateLimits"),
	},
	{
		id: "analytics",
		icon: BarChart3,
		label: t("landing.capabilities.analytics"),
	},
	{
		id: "embed",
		icon: Boxes,
		label: t("landing.capabilities.anyWebsite"),
	},
]

export const getEmbedCodeLines = (scriptUrl: string): string[] => [
	"<script>",
	'  window.__TALQO__ = { token: "your-widget-token" };',
	"</script>",
	`<script async defer src="${scriptUrl}"></script>`,
]
