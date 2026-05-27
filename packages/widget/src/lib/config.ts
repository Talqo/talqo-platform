import type { ResolvedWidgetConfig, WidgetColors, WidgetIcons } from "@/types"

const API_URL = import.meta.env.VITE_API_URL ?? ""

export const HARDCODED_DEFAULTS: ResolvedWidgetConfig = {
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

export function toWidgetColors(
	raw: unknown,
	defaults: WidgetColors,
): WidgetColors {
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

export function toWidgetIcons(
	raw: unknown,
	defaults: WidgetIcons,
): WidgetIcons {
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

export async function fetchWidgetConfig(
	token: string,
	apiUrl: string = API_URL,
): Promise<ResolvedWidgetConfig> {
	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), 5000)
	try {
		const res = await fetch(`${apiUrl}/widget/config`, {
			headers: { "X-Widget-Token": token },
			signal: controller.signal,
		})
		clearTimeout(timer)
		if (!res.ok) return { ...HARDCODED_DEFAULTS, widgetToken: token, apiUrl }
		const raw: unknown = await res.json()
		if (!isWidgetConfigApiResponse(raw)) {
			return { ...HARDCODED_DEFAULTS, widgetToken: token, apiUrl }
		}
		const resolvedLight = toWidgetColors(
			raw.lightColors,
			HARDCODED_DEFAULTS.colors,
		)
		return {
			widgetToken: token,
			apiUrl,
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
		return { ...HARDCODED_DEFAULTS, widgetToken: token, apiUrl }
	}
}
