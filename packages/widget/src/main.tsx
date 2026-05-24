import { StrictMode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { EmbeddedWidget } from "./EmbeddedWidget"
import { getOrCreateBrowserSessionId } from "./hooks/useWidget"
import type {
	PagePalConfig,
	ResolvedWidgetConfig,
	WidgetColors,
	WidgetIcons,
} from "./types"
import "./theme/default.css"

const API_URL = import.meta.env.VITE_API_URL ?? ""

// Global config type augmentation
declare global {
	// biome-ignore lint/style/useConsistentTypeDefinitions: declaration merging required for global Window augmentation
	interface Window {
		__PAGEPAL__?: PagePalConfig
	}
}

// Module-level reference to track mounted root
let mountedRoot: Root | null = null

const HARDCODED_DEFAULTS: ResolvedWidgetConfig = {
	widgetToken: "",
	apiUrl: API_URL,
	colors: {
		primary: "#16a34a",
		bgPrimary: "#ffffff",
		bgSecondary: "#f3f4f6",
		textPrimary: "#111827",
		textSecondary: "#6b7280",
		border: "#e5e7eb",
		headerTitleText: "#ffffff",
		userMessageText: "#ffffff",
		sendButtonIcon: "#ffffff",
		footerText: "#ffffff",
	},
	darkColors: {
		primary: "#16a34a",
		bgPrimary: "#09090b",
		bgSecondary: "#27272a",
		textPrimary: "#fafafa",
		textSecondary: "#a1a1aa",
		border: "#27272a",
		headerTitleText: "#ffffff",
		userMessageText: "#ffffff",
		sendButtonIcon: "#ffffff",
		footerText: "#ffffff",
	},
	position: "right",
	defaultOpen: false,
	botName: "AI Assistant",
	icons: { botAvatar: "bot" },
}

type WidgetConfigApiResponse = {
	botName: string
	position: string
	lightColors: Record<string, unknown> | null
	darkColors: Record<string, unknown> | null
	icons: Record<string, unknown> | null
}

function isWidgetConfigApiResponse(
	data: unknown,
): data is WidgetConfigApiResponse {
	return (
		typeof data === "object" &&
		data !== null &&
		"botName" in data &&
		"lightColors" in data &&
		"darkColors" in data &&
		"icons" in data
	)
}

function toWidgetColors(raw: unknown, defaults: WidgetColors): WidgetColors {
	const obj =
		typeof raw === "object" && raw !== null
			? (raw as Record<string, unknown>)
			: {}
	const str = (v: unknown, def: string) => (typeof v === "string" ? v : def)
	return {
		primary: str(obj.primary, defaults.primary),
		bgPrimary: str(obj.bgPrimary, defaults.bgPrimary),
		bgSecondary: str(obj.bgSecondary, defaults.bgSecondary),
		textPrimary: str(obj.textPrimary, defaults.textPrimary),
		textSecondary: str(obj.textSecondary, defaults.textSecondary),
		border: str(obj.border, defaults.border),
		headerTitleText: str(obj.headerTitleText, defaults.headerTitleText),
		userMessageText: str(obj.userMessageText, defaults.userMessageText),
		sendButtonIcon: str(obj.sendButtonIcon, defaults.sendButtonIcon),
		footerText: str(obj.footerText, defaults.footerText),
	}
}

function toWidgetIcons(raw: unknown, defaults: WidgetIcons): WidgetIcons {
	const obj =
		typeof raw === "object" && raw !== null
			? (raw as Record<string, unknown>)
			: {}
	return {
		botAvatar:
			typeof obj.botAvatar === "string" ? obj.botAvatar : defaults.botAvatar,
	}
}

function generateDarkFromLight(light: WidgetColors): WidgetColors {
	return {
		...HARDCODED_DEFAULTS.darkColors,
		primary: light.primary,
	}
}

async function fetchWidgetConfig(token: string): Promise<ResolvedWidgetConfig> {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), 5000)
	try {
		const res = await fetch(`${API_URL}/widget/config`, {
			headers: { "X-Widget-Token": token },
			signal: controller.signal,
		})
		clearTimeout(timer)
		if (!res.ok)
			return { ...HARDCODED_DEFAULTS, widgetToken: token, apiUrl: API_URL }
		const raw: unknown = await res.json()
		if (!isWidgetConfigApiResponse(raw)) {
			return { ...HARDCODED_DEFAULTS, widgetToken: token, apiUrl: API_URL }
		}
		const resolvedLight = toWidgetColors(
			raw.lightColors,
			HARDCODED_DEFAULTS.colors,
		)
		return {
			widgetToken: token,
			apiUrl: API_URL,
			colors: resolvedLight,
			darkColors: raw.darkColors
				? toWidgetColors(raw.darkColors, HARDCODED_DEFAULTS.darkColors)
				: generateDarkFromLight(resolvedLight),
			position:
				raw.position === "left" || raw.position === "right"
					? raw.position
					: HARDCODED_DEFAULTS.position,
			defaultOpen: HARDCODED_DEFAULTS.defaultOpen,
			botName: raw.botName ?? HARDCODED_DEFAULTS.botName,
			icons: toWidgetIcons(raw.icons, HARDCODED_DEFAULTS.icons),
		}
	} catch {
		clearTimeout(timer)
		return { ...HARDCODED_DEFAULTS, widgetToken: token, apiUrl: API_URL }
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

	// Dark mode colors
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

function trackPageview(token: string, apiUrl: string): void {
	if (!token) return
	const browserSessionId = getOrCreateBrowserSessionId()
	fetch(`${apiUrl}/widget/sessions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Widget-Token": token,
		},
		body: JSON.stringify({ browserSessionId }),
	}).catch(() => {})
}

async function init(): Promise<void> {
	if (mountedRoot) return

	const token = window.__PAGEPAL__?.token
	if (!token) {
		console.error("[PagePal] Missing required config: window.__PAGEPAL__.token")
		return
	}

	try {
		const config = await fetchWidgetConfig(token)
		trackPageview(token, API_URL)
		const container = injectCSSVariables(config)
		if ((container as HTMLElement & { __aiWidgetRoot?: Root }).__aiWidgetRoot)
			return
		const root = createRoot(container)
		;(container as HTMLElement & { __aiWidgetRoot?: Root }).__aiWidgetRoot =
			root
		mountedRoot = root
		root.render(
			<StrictMode>
				<EmbeddedWidget config={config} />
			</StrictMode>,
		)
	} catch (error) {
		console.error("[PagePal] Failed to initialize:", error)
	}
}

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => {
		void init()
	})
} else {
	void init()
}
