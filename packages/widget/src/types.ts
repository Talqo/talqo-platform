/**
 * Configuration for the embedded AI widget
 * Customers set this via window.__AI_WIDGET_CONFIG__
 */
export interface WidgetConfig {
	/** Client ID for API authentication */
	clientId: string
	/**
	 * Optional API base URL.
	 * Falls back to VITE_API_URL environment variable if not provided.
	 * Defaults to "https://dev.pagepal.dyn.cloud.e-infra.cz" in development.
	 */
	apiUrl?: string
	/** Theme colors - omit to use defaults */
	colors?: Partial<WidgetColors>
	/** Dark mode colors - if not provided, will be auto-generated from light colors */
	darkColors?: Partial<WidgetColors>
	/** Custom icons configuration - icon names or SVG strings */
	icons?: Partial<WidgetIcons>
	/** Widget positioning */
	position?: "left" | "right"
	/** Initial open state */
	defaultOpen?: boolean
	/** Bot name shown in header - default: "AI Assistant" */
	botName?: string
}

export interface WidgetColors {
	/** Primary accent color (buttons, user messages) - default: #64748b */
	primary: string
	/** Panel background - default: #ffffff */
	bgPrimary: string
	/** Header/bot message background - default: #f1f5f9 */
	bgSecondary: string
	/** Main text color - default: #0f172a */
	textPrimary: string
	/** Secondary text (footer, placeholders) - default: #64748b */
	textSecondary: string
	/** Borders and dividers - default: #e2e8f0 */
	border: string
}

export interface WidgetIcons {
	/** Bot avatar icon - shown in header and messages - default: bot */
	botAvatar: string
}

/** Validated config with defaults applied */
export interface ResolvedWidgetConfig
	extends Required<
		Omit<WidgetConfig, "colors" | "darkColors" | "icons" | "botName">
	> {
	colors: WidgetColors
	darkColors?: WidgetColors
	icons: WidgetIcons
	botName: string
}

export type WidgetTheme = "light" | "dark"
