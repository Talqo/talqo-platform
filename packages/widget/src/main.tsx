import { StrictMode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { EmbeddedWidget } from "./EmbeddedWidget"
import type { ResolvedWidgetConfig, WidgetColors, WidgetConfig } from "./types"
import "./theme/default.css"

// Global config type augmentation
declare global {
	// biome-ignore lint/style/useConsistentTypeDefinitions: declaration merging required for global Window augmentation
	interface Window {
		__AI_WIDGET_CONFIG__?: WidgetConfig
	}
}

// Module-level reference to track mounted root
let mountedRoot: Root | null = null

const DEFAULT_COLORS: WidgetColors = {
	primary: "hsl(220 14% 46%)", // Neutral gray (neutral-600), must be provided by customer
	bgPrimary: "#ffffff",
	bgSecondary: "hsl(220 14% 96%)", // Neutral gray (gray-100)
	textPrimary: "hsl(220 14% 10%)", // Neutral dark (gray-900)
	textSecondary: "hsl(220 9% 46%)", // Neutral gray (gray-500)
	border: "hsl(220 13% 91%)", // Neutral border (gray-200)
	headerTitleText: "#ffffff",
	userMessageText: "#ffffff",
	sendButtonIcon: "#ffffff",
	footerText: "rgba(255, 255, 255, 0.8)",
}

function resolveColors(
	userColors: Partial<WidgetColors> | undefined,
): WidgetColors {
	return {
		primary: userColors?.primary ?? DEFAULT_COLORS.primary,
		bgPrimary: userColors?.bgPrimary ?? DEFAULT_COLORS.bgPrimary,
		bgSecondary: userColors?.bgSecondary ?? DEFAULT_COLORS.bgSecondary,
		textPrimary: userColors?.textPrimary ?? DEFAULT_COLORS.textPrimary,
		textSecondary: userColors?.textSecondary ?? DEFAULT_COLORS.textSecondary,
		border: userColors?.border ?? DEFAULT_COLORS.border,
		headerTitleText:
			userColors?.headerTitleText ?? DEFAULT_COLORS.headerTitleText,
		userMessageText:
			userColors?.userMessageText ?? DEFAULT_COLORS.userMessageText,
		sendButtonIcon: userColors?.sendButtonIcon ?? DEFAULT_COLORS.sendButtonIcon,
		footerText: userColors?.footerText ?? DEFAULT_COLORS.footerText,
	}
}

function resolveDarkColors(
	lightColors: WidgetColors,
	userDarkColors: Partial<WidgetColors> | undefined,
): WidgetColors {
	// If user provided custom dark colors, use them; otherwise auto-generate
	if (userDarkColors) {
		return {
			primary: userDarkColors.primary ?? lightColors.primary,
			bgPrimary: userDarkColors.bgPrimary ?? "hsl(240 10% 3.9%)",
			bgSecondary: userDarkColors.bgSecondary ?? "hsl(240 4% 16%)",
			textPrimary: userDarkColors.textPrimary ?? "hsl(0 0% 98%)",
			textSecondary: userDarkColors.textSecondary ?? "hsl(240 5% 65%)",
			border: userDarkColors.border ?? "hsl(240 4% 16%)",
			headerTitleText:
				userDarkColors.headerTitleText ?? lightColors.headerTitleText,
			userMessageText:
				userDarkColors.userMessageText ?? lightColors.userMessageText,
			sendButtonIcon:
				userDarkColors.sendButtonIcon ?? lightColors.sendButtonIcon,
			footerText: userDarkColors.footerText ?? lightColors.footerText,
		}
	}

	// Auto-generate dark colors based on light colors
	return {
		primary: lightColors.primary,
		bgPrimary: "hsl(240 10% 3.9%)",
		bgSecondary: "hsl(240 4% 16%)",
		textPrimary: "hsl(0 0% 98%)",
		textSecondary: "hsl(240 5% 65%)",
		border: "hsl(240 4% 16%)",
		headerTitleText: lightColors.headerTitleText,
		userMessageText: lightColors.userMessageText,
		sendButtonIcon: lightColors.sendButtonIcon,
		footerText: lightColors.footerText,
	}
}

function resolveConfig(): ResolvedWidgetConfig {
	const userConfig = window.__AI_WIDGET_CONFIG__

	if (!userConfig?.widgetToken) {
		throw new Error(
			"[AI Widget] Missing required config: window.__AI_WIDGET_CONFIG__.widgetToken",
		)
	}

	const apiUrl = userConfig.apiUrl || import.meta.env.VITE_API_URL
	if (!apiUrl) {
		throw new Error(
			"[AI Widget] Missing required config: window.__AI_WIDGET_CONFIG__.apiUrl or VITE_API_URL environment variable",
		)
	}

	const lightColors = resolveColors(userConfig.colors)
	const resolvedDarkColors = resolveDarkColors(
		lightColors,
		userConfig.darkColors,
	)

	return {
		widgetToken: userConfig.widgetToken,
		apiUrl,
		colors: lightColors,
		darkColors: resolvedDarkColors,
		position: userConfig.position ?? "right",
		defaultOpen: userConfig.defaultOpen ?? false,
		botName: userConfig.botName ?? "AI Assistant",
		icons: {
			botAvatar: userConfig.icons?.botAvatar ?? "bot",
		},
	}
}

function injectCSSVariables(config: ResolvedWidgetConfig): HTMLElement {
	// Check if root element already exists to prevent duplicate mounts
	const existingRoot = document.getElementById("ai-widget-root")
	if (existingRoot) {
		return existingRoot
	}

	const root = document.createElement("div")
	root.id = "ai-widget-root"

	// Light mode colors (default)
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

	// Dark mode colors - config.darkColors is always populated by resolveConfig
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

const SESSION_ID_KEY = "pagepal:widget:sessionId"

function getOrCreateBrowserSessionId(): string | null {
	try {
		const existing = localStorage.getItem(SESSION_ID_KEY)
		if (existing) return existing
		const id = crypto.randomUUID()
		localStorage.setItem(SESSION_ID_KEY, id)
		return id
	} catch {
		return null
	}
}

function trackPageview(config: ResolvedWidgetConfig): void {
	if (!config.widgetToken) return
	const browserSessionId = getOrCreateBrowserSessionId()
	if (!browserSessionId) return
	fetch(`${config.apiUrl}/widget/sessions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Widget-Token": config.widgetToken,
		},
		body: JSON.stringify({ browserSessionId }),
	}).catch(() => {})
}

function init(): void {
	// Prevent double initialization if root already exists
	if (mountedRoot) {
		return
	}

	try {
		const config = resolveConfig()
		trackPageview(config)
		const container = injectCSSVariables(config)

		// Check if React root already exists on container
		if ((container as HTMLElement & { __aiWidgetRoot?: Root }).__aiWidgetRoot) {
			return
		}

		const root = createRoot(container)
		// Store reference to prevent double initialization
		;(container as HTMLElement & { __aiWidgetRoot?: Root }).__aiWidgetRoot =
			root
		mountedRoot = root

		root.render(
			<StrictMode>
				<EmbeddedWidget config={config} />
			</StrictMode>,
		)
	} catch (error) {
		console.error("[AI Widget] Failed to initialize:", error)
	}
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init)
} else {
	init()
}
