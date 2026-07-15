export const getWidgetBundleUrl = () => {
	if (import.meta.env.VITE_WIDGET_BUNDLE_URL) {
		return import.meta.env.VITE_WIDGET_BUNDLE_URL
	}

	if (import.meta.env.DEV) {
		return "http://localhost:5174/widget-bundle.js"
	}

	return `${window.location.origin}/widget-bundle.js`
}
