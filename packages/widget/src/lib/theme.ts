import type { ResolvedWidgetConfig } from "@/types"

function applyCSSVariablesToElement(
	element: HTMLElement,
	config: ResolvedWidgetConfig,
): void {
	element.style.setProperty("--widget-primary", config.colors.primary)
	element.style.setProperty("--widget-bg-primary", config.colors.bgPrimary)
	element.style.setProperty("--widget-bg-secondary", config.colors.bgSecondary)
	element.style.setProperty("--widget-text-primary", config.colors.textPrimary)
	element.style.setProperty(
		"--widget-text-secondary",
		config.colors.textSecondary,
	)
	element.style.setProperty("--widget-border", config.colors.border)
	element.style.setProperty(
		"--widget-header-title-text",
		config.colors.headerTitleText,
	)
	element.style.setProperty(
		"--widget-user-message-text",
		config.colors.userMessageText,
	)
	element.style.setProperty(
		"--widget-send-button-icon",
		config.colors.sendButtonIcon,
	)
	element.style.setProperty("--widget-footer-text", config.colors.footerText)

	element.style.setProperty("--widget-dark-primary", config.darkColors.primary)
	element.style.setProperty(
		"--widget-dark-bg-primary",
		config.darkColors.bgPrimary,
	)
	element.style.setProperty(
		"--widget-dark-bg-secondary",
		config.darkColors.bgSecondary,
	)
	element.style.setProperty(
		"--widget-dark-text-primary",
		config.darkColors.textPrimary,
	)
	element.style.setProperty(
		"--widget-dark-text-secondary",
		config.darkColors.textSecondary,
	)
	element.style.setProperty("--widget-dark-border", config.darkColors.border)
	element.style.setProperty(
		"--widget-dark-header-title-text",
		config.darkColors.headerTitleText,
	)
	element.style.setProperty(
		"--widget-dark-user-message-text",
		config.darkColors.userMessageText,
	)
	element.style.setProperty(
		"--widget-dark-send-button-icon",
		config.darkColors.sendButtonIcon,
	)
	element.style.setProperty(
		"--widget-dark-footer-text",
		config.darkColors.footerText,
	)
}

export function injectCSSVariables(config: ResolvedWidgetConfig): HTMLElement {
	const existingRoot = document.getElementById("ai-widget-root")
	if (existingRoot) {
		applyCSSVariablesToElement(existingRoot, config)
		return existingRoot
	}

	const root = document.createElement("div")
	root.id = "ai-widget-root"
	applyCSSVariablesToElement(root, config)

	document.body.appendChild(root)
	return root
}
