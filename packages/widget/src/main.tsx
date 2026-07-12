import { StrictMode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { trackPageview } from "@/lib/analytics"
import { fetchWidgetConfig } from "@/lib/config"
import { injectCSSVariables } from "@/lib/theme"
import { EmbeddedWidget } from "./EmbeddedWidget"
import type { TalqoConfig } from "./types"
import "./theme/default.css"

const API_URL = import.meta.env.VITE_API_URL ?? ""

declare global {
	// biome-ignore lint/style/useConsistentTypeDefinitions: declaration merging required for global Window augmentation
	interface Window {
		__TALQO__?: TalqoConfig
		__TALQO_WIDGET__?: { destroy: () => void }
	}
}

let mountedRoot: Root | null = null
let initGeneration = 0

export function isCurrentTalqoToken(token: string): boolean {
	if (typeof window === "undefined") return false

	return window.__TALQO__?.token === token
}

function destroy(): void {
	initGeneration += 1
	if (typeof document === "undefined") return

	const container = document.getElementById("ai-widget-root")
	const wrapper = container as (HTMLElement & { __aiWidgetRoot?: Root }) | null
	const root = wrapper?.__aiWidgetRoot ?? mountedRoot
	root?.unmount()
	if (wrapper?.__aiWidgetRoot) delete wrapper.__aiWidgetRoot
	mountedRoot = null

	if (container?.parentNode) {
		container.parentNode.removeChild(container)
	}
}

async function init(): Promise<void> {
	if (mountedRoot) return

	const token = window.__TALQO__?.token
	if (!token) {
		console.error("[Talqo] Missing required config: window.__TALQO__.token")
		return
	}
	const generation = initGeneration

	try {
		const config = await fetchWidgetConfig(token, API_URL)
		if (generation !== initGeneration) return
		if (!isCurrentTalqoToken(token)) return

		trackPageview(token, API_URL)
		const container = injectCSSVariables(config)

		const wrapper = container as HTMLElement & { __aiWidgetRoot?: Root }
		if (wrapper.__aiWidgetRoot) return

		const root = createRoot(container)
		wrapper.__aiWidgetRoot = root
		mountedRoot = root

		root.render(
			<StrictMode>
				<EmbeddedWidget config={config} />
			</StrictMode>,
		)
	} catch (error) {
		console.error("[Talqo] Failed to initialize:", error)
	}
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
	window.__TALQO_WIDGET__ = { destroy }

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () => {
			void init()
		})
	} else {
		void init()
	}
}
