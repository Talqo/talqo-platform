export type PagePalConfig = {
	token: string
}

export type WidgetColors = {
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
	/** Header title text color - default: #ffffff */
	headerTitleText: string
	/** User message text color - default: #ffffff */
	userMessageText: string
	/** Send button icon color - default: #ffffff */
	sendButtonIcon: string
	/** Footer text color - default: #ffffff */
	footerText: string
}

export type WidgetIcons = {
	/** Bot avatar icon - shown in header and messages - default: bot */
	botAvatar: string
}

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

export type WidgetTheme = "light" | "dark"
