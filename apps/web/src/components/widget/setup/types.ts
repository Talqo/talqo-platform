export type WidgetColors = {
	primary: string
	bgPrimary: string
	bgSecondary: string
	textPrimary: string
	textSecondary: string
	border: string
	headerTitleText: string
	userMessageText: string
	sendButtonIcon: string
	footerText: string
}

export type WidgetColorsConfig = {
	light: WidgetColors
	dark: WidgetColors
}

export type WidgetIcons = {
	botAvatar: string
}

export const defaultColors: WidgetColorsConfig = {
	light: {
		primary: "#16a34a",
		bgPrimary: "#ffffff",
		bgSecondary: "#f3f4f6",
		textPrimary: "#111827",
		textSecondary: "#6b7280",
		border: "#e5e7eb",
		headerTitleText: "#ffffff",
		userMessageText: "#ffffff",
		sendButtonIcon: "#ffffff",
		footerText: "rgba(255, 255, 255, 0.8)",
	},
	dark: {
		primary: "#16a34a",
		bgPrimary: "#09090b",
		bgSecondary: "#27272a",
		textPrimary: "#fafafa",
		textSecondary: "#a1a1aa",
		border: "#27272a",
		headerTitleText: "#ffffff",
		userMessageText: "#ffffff",
		sendButtonIcon: "#ffffff",
		footerText: "rgba(255, 255, 255, 0.8)",
	},
}

export const defaultIcons: WidgetIcons = {
	botAvatar: "bot",
}
