export interface WidgetColors {
	primary: string
	bgPrimary: string
	bgSecondary: string
	textPrimary: string
	textSecondary: string
	border: string
}

export interface WidgetColorsConfig {
	light: WidgetColors
	dark: WidgetColors
}

export const defaultColors: WidgetColorsConfig = {
	light: {
		primary: "#16a34a",
		bgPrimary: "#ffffff",
		bgSecondary: "#f3f4f6",
		textPrimary: "#111827",
		textSecondary: "#6b7280",
		border: "#e5e7eb",
	},
	dark: {
		primary: "#16a34a",
		bgPrimary: "#09090b",
		bgSecondary: "#27272a",
		textPrimary: "#fafafa",
		textSecondary: "#a1a1aa",
		border: "#27272a",
	},
}
