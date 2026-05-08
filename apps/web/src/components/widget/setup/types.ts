import { defaultWidgetVisualConfig } from "shared"

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
	light: defaultWidgetVisualConfig.lightColors,
	dark: defaultWidgetVisualConfig.darkColors,
}

export const defaultIcons: WidgetIcons = defaultWidgetVisualConfig.icons
