export type PagePalConfig = {
	token: string
}

import type { WidgetColors, WidgetIcons } from "shared"

export type { WidgetColors, WidgetIcons }

/** Internal resolved config with all fields populated */
export type ResolvedWidgetConfig = {
	widgetToken: string
	apiUrl: string
	colors: WidgetColors
	darkColors: WidgetColors
	icons: WidgetIcons
	botName: string
	position: "left" | "right"
	defaultOpen: boolean
}

export type WidgetApiConfig = {
	widgetToken: string
	apiUrl: string
}

export type WidgetTheme = "light" | "dark"
