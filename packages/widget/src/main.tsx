import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { EmbeddedWidget } from "./EmbeddedWidget"
import type { ResolvedWidgetConfig, WidgetColors, WidgetConfig } from "./types"
import "./theme/default.css"

// Global config type augmentation
declare global {
	interface Window {
		__AI_WIDGET_CONFIG__?: WidgetConfig
	}
}

const DEFAULT_COLORS: WidgetColors = {
	primary: "hsl(220 14% 46%)", // Neutral gray (neutral-600), must be provided by customer
	bgPrimary: "#ffffff",
	bgSecondary: "hsl(220 14% 96%)", // Neutral gray (gray-100)
	textPrimary: "hsl(220 14% 10%)", // Neutral dark (gray-900)
	textSecondary: "hsl(220 9% 46%)", // Neutral gray (gray-500)
	border: "hsl(220 13% 91%)", // Neutral border (gray-200)
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
	}
}

function resolveConfig(): ResolvedWidgetConfig {
	const userConfig = window.__AI_WIDGET_CONFIG__

	if (!userConfig?.clientId) {
		throw new Error(
			"[AI Widget] Missing required config: window.__AI_WIDGET_CONFIG__.clientId",
		)
	}

	const lightColors = resolveColors(userConfig.colors)

	return {
		clientId: userConfig.clientId,
		apiUrl:
			userConfig.apiUrl ||
			import.meta.env.VITE_API_URL ||
			"https://dev.pagepal.dyn.cloud.e-infra.cz/",
		colors: lightColors,
		darkColors: resolveDarkColors(lightColors, userConfig.darkColors),
		position: userConfig.position ?? "right",
		defaultOpen: userConfig.defaultOpen ?? false,
		botName: userConfig.botName ?? "AI Assistant",
		icons: {
			botAvatar: userConfig.icons?.botAvatar ?? "bot",
		},
	}
}

function darkenColor(color: string, percent = 6): string {
	// Simple hex darkening - assumes hex format or returns as-is
	if (!color.startsWith("#")) return color

	const hex = color.slice(1)
	const r = Math.max(
		0,
		Number.parseInt(hex.substring(0, 2), 16) - percent * 2.55,
	)
	const g = Math.max(
		0,
		Number.parseInt(hex.substring(2, 4), 16) - percent * 2.55,
	)
	const b = Math.max(
		0,
		Number.parseInt(hex.substring(4, 6), 16) - percent * 2.55,
	)

	return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`
}

function injectCSSVariables(config: ResolvedWidgetConfig): HTMLElement {
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
		"--widget-primary-hover",
		darkenColor(config.colors.primary),
	)

	// Dark mode colors - use resolved dark colors from config
	const darkColors =
		config.darkColors ?? resolveDarkColors(config.colors, undefined)
	root.style.setProperty("--widget-dark-primary", darkColors.primary)
	root.style.setProperty("--widget-dark-bg-primary", darkColors.bgPrimary)
	root.style.setProperty("--widget-dark-bg-secondary", darkColors.bgSecondary)
	root.style.setProperty("--widget-dark-text-primary", darkColors.textPrimary)
	root.style.setProperty(
		"--widget-dark-text-secondary",
		darkColors.textSecondary,
	)
	root.style.setProperty("--widget-dark-border", darkColors.border)

	document.body.appendChild(root)
	return root
}

function init(): void {
	try {
		const config = resolveConfig()
		const container = injectCSSVariables(config)

		const root = createRoot(container)
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
