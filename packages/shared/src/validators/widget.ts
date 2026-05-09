import { z } from "zod"

export const createSessionBodySchema = z.object({
	browserSessionId: z.string().min(1),
})

export const rateConversationBodySchema = z.object({
	rating: z.number().int().min(1).max(5),
})

export const sendMessageBodySchema = z.object({
	content: z.string().min(1),
})

export const widgetColorsSchema = z.object({
	primary: z.string().min(1),
	bgPrimary: z.string().min(1),
	bgSecondary: z.string().min(1),
	textPrimary: z.string().min(1),
	textSecondary: z.string().min(1),
	border: z.string().min(1),
	headerTitleText: z.string().min(1),
	userMessageText: z.string().min(1),
	sendButtonIcon: z.string().min(1),
	footerText: z.string().min(1),
})

export type WidgetColors = z.infer<typeof widgetColorsSchema>

export const widgetIconsSchema = z.object({
	botAvatar: z.string().min(1),
})

export type WidgetIcons = z.infer<typeof widgetIconsSchema>

export const widgetVisualConfigSchema = z.object({
	botName: z.string().max(255).default("AI Assistant"),
	position: z.enum(["left", "right"]).default("right"),
	lightColors: widgetColorsSchema,
	darkColors: widgetColorsSchema,
	icons: widgetIconsSchema,
})

export type WidgetVisualConfig = z.infer<typeof widgetVisualConfigSchema>

export const defaultWidgetVisualConfig = {
	botName: "AI Assistant",
	position: "right" as const,
	lightColors: {
		primary: "#16a34a",
		bgPrimary: "#ffffff",
		bgSecondary: "#f3f4f6",
		textPrimary: "#111827",
		textSecondary: "#6b7280",
		border: "#e5e7eb",
		headerTitleText: "#ffffff",
		userMessageText: "#ffffff",
		sendButtonIcon: "#ffffff",
		footerText: "#ffffff",
	},
	darkColors: {
		primary: "#16a34a",
		bgPrimary: "#09090b",
		bgSecondary: "#27272a",
		textPrimary: "#fafafa",
		textSecondary: "#a1a1aa",
		border: "#27272a",
		headerTitleText: "#ffffff",
		userMessageText: "#ffffff",
		sendButtonIcon: "#ffffff",
		footerText: "#ffffff",
	},
	icons: { botAvatar: "bot" },
} satisfies WidgetVisualConfig
