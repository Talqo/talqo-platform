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
	primary: "hsl(220 14% 46%)", // Neutral gray neutral-600), must be provided by customer
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

function resolveConfig(): ResolvedWidgetConfig {
	const userConfig = window.__AI_WIDGET_CONFIG__

	if (!userConfig?.clientId) {
		throw new Error(
			"[AI Widget] Missing required config: window.__AI_WIDGET_CONFIG__.clientId",
		)
	}

	return {
		clientId: userConfig.clientId,
		apiUrl:
			userConfig.apiUrl ||
			import.meta.env.VITE_API_URL ||
			"https://dev.pagepa.dyn.cloud.e-infra.cz/",
		colors: resolveColors(userConfig.colors),
		position: userConfig.position ?? "right",
		defaultOpen: userConfig.defaultOpen ?? false,
	}
}

function injectCSSVariables(config: ResolvedWidgetConfig): HTMLElement {
	const root = document.createElement("div")
	root.id = "ai-widget-root"
	root.style.setProperty("--widget-primary", config.colors.primary)
	root.style.setProperty("--widget-bg-primary", config.colors.bgPrimary)
	root.style.setProperty("--widget-bg-secondary", config.colors.bgSecondary)
	root.style.setProperty("--widget-text-primary", config.colors.textPrimary)
	root.style.setProperty("--widget-text-secondary", config.colors.textSecondary)
	root.style.setProperty("--widget-border", config.colors.border)
	root.style.setProperty("--widget-primary-hover", config.colors.primary)

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
