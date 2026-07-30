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
} from "lucide-react";

export type LandingStep = {
	id: string;
	icon: LucideIcon;
	label: string;
	description: string;
};

export type UseCase = {
	id: string;
	icon: LucideIcon;
	label: string;
	question: string;
	answer: string;
	// Tailwind bg class that tints the use-case card; only motif tokens.
	accent: string;
};

export type Capability = {
	id: string;
	icon: LucideIcon;
	label: string;
};

export type EmbedCodeLine = {
	content: string;
	highlight?: boolean;
};

// Same CDN bundle URL as the dashboard widget setup page.
export const WIDGET_SCRIPT_URL = "https://cdn.talqo.dev/widget/v1.js";

export const getEmbedCodeLines = (botId: string): EmbedCodeLine[] => [
	{ content: "<script" },
	{ content: `  src="${WIDGET_SCRIPT_URL}"` },
	{ content: `  data-talqo-bot="${botId}"`, highlight: true },
	{ content: "  defer" },
	{ content: "></script>" },
];

export const landingSteps: LandingStep[] = [
	{
		id: "configure",
		icon: Settings2,
		label: "Configure",
		description:
			"Add product data, policies, docs, tools, brand colors, and support rules.",
	},
	{
		id: "paste",
		icon: Code2,
		label: "Embed",
		description: "Add the generated widget snippet to your website.",
	},
	{
		id: "launch",
		icon: Rocket,
		label: "Launch",
		description: "Save the page. The widget appears and is ready for visitors.",
	},
];

export const useCases: UseCase[] = [
	{
		id: "shop",
		icon: ShoppingBag,
		label: "Shop",
		question: "Where is my order?",
		answer: "Order status found. Delivery is tomorrow.",
		accent: "bg-primary/15",
	},
	{
		id: "saas",
		icon: TerminalSquare,
		label: "SaaS",
		question: "How do I connect the API?",
		answer: "Here is the setup path from your docs.",
		accent: "bg-secondary",
	},
	{
		id: "services",
		icon: CalendarClock,
		label: "Services",
		question: "Can I book Tuesday?",
		answer: "Tuesday has two open slots.",
		accent: "bg-accent",
	},
];

export const capabilities: Capability[] = [
	{ id: "knowledge", icon: BrainCircuit, label: "RAG knowledge base" },
	{ id: "mcp", icon: PlugZap, label: "MCP tools" },
	{ id: "brand", icon: Brush, label: "Brand colors" },
	{ id: "personality", icon: SlidersHorizontal, label: "Custom personality" },
	{ id: "byok", icon: KeyRound, label: "BYOK" },
	{ id: "embed", icon: Boxes, label: "Any website" },
];
