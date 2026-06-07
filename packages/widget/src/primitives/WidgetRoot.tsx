import { createContext, type ReactNode, useContext } from "react"
import { type UseWidgetOptions, type UseWidgetReturn, useWidget } from "@/hooks"

type WidgetContextValue = UseWidgetReturn & {
	/** Optional className prefix for styling */
	classNamePrefix?: string
}

const WidgetContext = createContext<WidgetContextValue | null>(null)

export function useWidgetContext() {
	const context = useContext(WidgetContext)
	if (!context) {
		throw new Error(
			"Widget components must be used within a Widget.Root provider",
		)
	}
	return context
}

type WidgetRootProps = UseWidgetOptions & {
	children: ReactNode
	/** Optional className prefix for all child components */
	classNamePrefix?: string
}

/**
 * Root provider component for the widget
 * Manages all state and provides it to child components via context
 */
export function WidgetRoot(props: WidgetRootProps) {
	const { children, classNamePrefix, ...options } = props
	const widgetState = useWidget(options)

	return (
		<WidgetContext.Provider value={{ ...widgetState, classNamePrefix }}>
			{children}
		</WidgetContext.Provider>
	)
}

export type { WidgetRootProps }
