import { useEffect } from "react"
import { getWidgetBundleUrl } from "@/lib/widget-bundle-url"

const LANDING_WIDGET_TOKEN = "00000000-0000-4000-8001-000000000012"
const SCRIPT_ID = "talqo-landing-widget-script"
const WIDGET_ROOT_ID = "ai-widget-root"

declare global {
	// biome-ignore lint/style/useConsistentTypeDefinitions: declaration merging required for global Window augmentation
	interface Window {
		__TALQO__?: { token: string }
		__TALQO_WIDGET__?: { destroy: () => void }
	}
}

export function LandingWidgetEmbed() {
	useEffect(() => {
		window.__TALQO__ = { token: LANDING_WIDGET_TOKEN }

		if (!document.getElementById(SCRIPT_ID)) {
			const script = document.createElement("script")
			script.id = SCRIPT_ID
			script.async = true
			script.defer = true
			script.src = getWidgetBundleUrl()
			document.body.appendChild(script)
		}

		return () => {
			window.__TALQO_WIDGET__?.destroy()

			const currentScript = document.getElementById(SCRIPT_ID)
			if (currentScript?.parentNode) {
				currentScript.parentNode.removeChild(currentScript)
			}

			const widgetRoot = document.getElementById(WIDGET_ROOT_ID)
			if (widgetRoot?.parentNode) {
				widgetRoot.parentNode.removeChild(widgetRoot)
			}

			if (window.__TALQO__?.token === LANDING_WIDGET_TOKEN) {
				delete window.__TALQO__
			}
		}
	}, [])

	return null
}
