import type { ResolvedWidgetConfig } from "@/types"

export function injectCSSVariables(config: ResolvedWidgetConfig): HTMLElement {
	const existingRoot = document.getElementById("ai-widget-root")
	if (existingRoot) {
		return existingRoot
	}

	const root = document.createElement("div")
	root.id = "ai-widget-root"

	root.style.setProperty("--widget-primary", config.colors.primary)
	root.style.setProperty("--widget-bg-primary", config.colors.bgPrimary)
	root.style.setProperty("--widget-bg-secondary", config.colors.bgSecondary)
	root.style.setProperty("--widget-text-primary", config.colors.textPrimary)
	root.style.setProperty("--widget-text-secondary", config.colors.textSecondary)
	root.style.setProperty("--widget-border", config.colors.border)
	root.style.setProperty(
		"--widget-header-title-text",
		config.colors.headerTitleText,
	)
	root.style.setProperty(
		"--widget-user-message-text",
		config.colors.userMessageText,
	)
	root.style.setProperty(
		"--widget-send-button-icon",
		config.colors.sendButtonIcon,
	)
	root.style.setProperty("--widget-footer-text", config.colors.footerText)

	root.style.setProperty("--widget-dark-primary", config.darkColors.primary)
	root.style.setProperty(
		"--widget-dark-bg-primary",
		config.darkColors.bgPrimary,
	)
	root.style.setProperty(
		"--widget-dark-bg-secondary",
		config.darkColors.bgSecondary,
	)
	root.style.setProperty(
		"--widget-dark-text-primary",
		config.darkColors.textPrimary,
	)
	root.style.setProperty(
		"--widget-dark-text-secondary",
		config.darkColors.textSecondary,
	)
	root.style.setProperty("--widget-dark-border", config.darkColors.border)
	root.style.setProperty(
		"--widget-dark-header-title-text",
		config.darkColors.headerTitleText,
	)
	root.style.setProperty(
		"--widget-dark-user-message-text",
		config.darkColors.userMessageText,
	)
	root.style.setProperty(
		"--widget-dark-send-button-icon",
		config.darkColors.sendButtonIcon,
	)
	root.style.setProperty(
		"--widget-dark-footer-text",
		config.darkColors.footerText,
	)

	document.body.appendChild(root)
	return root
}
