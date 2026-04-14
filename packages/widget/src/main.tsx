import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { EmbeddedWidget } from "./EmbeddedWidget"
import type { WidgetConfig } from "./types"
import "./theme/default.css"

// Global config type augmentation
declare global {
	interface Window {
		__AI_WIDGET_CONFIG__?: WidgetConfig
	}
}

const DEFAULT_COLORS = {
	primary: "hsl(142 76% 36%)",
	bgPrimary: "#ffffff",
	bgSecondary: "hsl(240 5% 96%)",
	textPrimary: "hsl(240 6% 10%)",
	textSecondary: "hsl(240 4% 46%)",
	border: "hsl(240 6% 90%)",
}

function resolveConfig(): Required<WidgetConfig> {
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
		colors: { ...DEFAULT_COLORS, ...userConfig.colors },
		position: userConfig.position ?? "right",
		defaultOpen: userConfig.defaultOpen ?? false,
	}
}

function injectCSSVariables(config: Required<WidgetConfig>): HTMLElement {
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
