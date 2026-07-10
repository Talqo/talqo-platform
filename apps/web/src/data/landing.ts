import {
	Boxes,
	BrainCircuit,
	Brush,
	CalendarClock,
	Code2,
	KeyRound,
	type LucideIcon,
	PlugZap,
	Rocket,
	Settings2,
	ShoppingBag,
	SlidersHorizontal,
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

export type EmbedCodeLine = {
	content: string
	highlight?: boolean
}

export const getEmbedCode = (scriptUrl: string): string =>
	`<script>
  window.__TALQO__ = { token: "your-widget-token" };
</script>
<script async defer src="${scriptUrl}"></script>`

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
		accent:
			"bg-[var(--landing-use-case-shop-bg)] text-[var(--landing-use-case-shop-fg)]",
	},
	{
		id: "saas",
		icon: TerminalSquare,
		label: t("landing.useCases.saas.label"),
		question: t("landing.useCases.saas.question"),
		answer: t("landing.useCases.saas.answer"),
		accent:
			"bg-[var(--landing-use-case-saas-bg)] text-[var(--landing-use-case-saas-fg)]",
	},
	{
		id: "services",
		icon: CalendarClock,
		label: t("landing.useCases.services.label"),
		question: t("landing.useCases.services.question"),
		answer: t("landing.useCases.services.answer"),
		accent:
			"bg-[var(--landing-use-case-services-bg)] text-[var(--landing-use-case-services-fg)]",
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
		id: "personality",
		icon: SlidersHorizontal,
		label: t("landing.capabilities.customPersonality"),
	},
	{
		id: "byok",
		icon: KeyRound,
		label: t("landing.capabilities.byok"),
	},
	{
		id: "embed",
		icon: Boxes,
		label: t("landing.capabilities.anyWebsite"),
	},
]

export const getEmbedCodeLines = (scriptUrl: string): EmbedCodeLine[] =>
	getEmbedCode(scriptUrl)
		.split("\n")
		.map((content, index) => ({
			content,
			highlight: index === 1,
		}))
