/**
 * Configuration for the embedded AI widget
 * Customers set this via window.__AI_WIDGET_CONFIG__
 */
export interface WidgetConfig {
	/** Client ID for API authentication */
	clientId: string
	/** Optional API base URL (defaults to production) */
	apiUrl?: string
	/** Theme colors - omit to use defaults */
	colors?: Partial<WidgetColors>
	/** Widget positioning */
	position?: "left" | "right"
	/** Initial open state */
	defaultOpen?: boolean
}

export interface WidgetColors {
	/** Primary accent color (buttons, user messages) - default: hsl(220 14% 46%) */
	primary: string
	/** Panel background - default: white */
	bgPrimary: string
	/** Header/bot message background - default: hsl(220 14% 96%) */
	bgSecondary: string
	/** Main text color - default: hsl(220 14% 10%) */
	textPrimary: string
	/** Secondary text (footer, placeholders) - default: hsl(220 9% 46%) */
	textSecondary: string
	/** Borders and dividers - default: hsl(220 13% 91%) */
	border: string
}

/** Validated config with defaults applied */
export interface ResolvedWidgetConfig
	extends Required<Omit<WidgetConfig, "colors">> {
	colors: WidgetColors
}

export type WidgetTheme = "light" | "dark"
