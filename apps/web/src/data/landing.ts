import { type LucideIcon, MessageSquare, Shield, Zap } from "lucide-react";

export interface Feature {
	id: string;
	icon: LucideIcon;
	title: string;
	description: string;
	color: "blue" | "green" | "purple";
}

export const FEATURES: Feature[] = [
	{
		id: "speed",
		icon: Zap,
		title: "Lightning Fast",
		description:
			"Instant responses powered by advanced AI models. Keep your users engaged without waiting.",
		color: "blue",
	},
	{
		id: "customizable",
		icon: Shield,
		title: "Customizable Context",
		description:
			"Connect MCP sources, define custom rules, and restrict terminology to suit your brand.",
		color: "green",
	},
	{
		id: "embed",
		icon: MessageSquare,
		title: "Embed Anywhere",
		description:
			"Simple React and JS embed codes. Get your widget up and running in minutes.",
		color: "purple",
	},
];
