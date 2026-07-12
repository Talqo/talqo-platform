export const getWidgetBundleUrl = () => {
	if (import.meta.env.VITE_WIDGET_BUNDLE_URL) {
		return import.meta.env.VITE_WIDGET_BUNDLE_URL
	}

	return `${window.location.origin}/widget-bundle.js`
}
