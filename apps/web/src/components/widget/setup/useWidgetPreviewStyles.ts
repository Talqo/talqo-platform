import type { WidgetColors } from "./types"

export function useWidgetPreviewStyles(themeColors: WidgetColors) {
	return {
		panel: { backgroundColor: themeColors.bgPrimary },
		header: { backgroundColor: themeColors.primary },
		headerTitle: { color: themeColors.headerTitleText },
		messages: { backgroundColor: themeColors.bgPrimary },
		avatar: { backgroundColor: themeColors.primary },
		botMessage: {
			backgroundColor: themeColors.bgSecondary,
			color: themeColors.textPrimary,
			border: `1px solid ${themeColors.border}`,
		},
		userMessage: {
			backgroundColor: themeColors.primary,
			color: themeColors.userMessageText,
		},
		input: {
			backgroundColor: themeColors.bgPrimary,
			borderColor: themeColors.border,
		},
		inputField: {
			backgroundColor: themeColors.bgSecondary,
			border: `1px solid ${themeColors.border}`,
			color: themeColors.textSecondary,
		},
		sendButton: {
			backgroundColor: themeColors.primary,
			color: themeColors.sendButtonIcon,
		},
		footer: {
			backgroundColor: themeColors.primary,
			color: themeColors.footerText,
		},
		trigger: { backgroundColor: themeColors.primary },
	}
}
