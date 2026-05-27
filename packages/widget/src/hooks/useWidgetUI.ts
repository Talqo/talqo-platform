import { useCallback, useState } from "react"
import { safeSetItem, THEME_STORAGE_KEY } from "@/lib/storage"
import type { WidgetTheme } from "@/types"

type UseWidgetUIOptions = {
	defaultOpen?: boolean
	position?: "left" | "right"
	defaultTheme?: WidgetTheme
	onOpenChange?: (isOpen: boolean) => void
}

export function useWidgetUI(options: UseWidgetUIOptions) {
	const {
		defaultOpen = false,
		position = "right",
		defaultTheme = "light",
		onOpenChange,
	} = options

	const [isOpen, setIsOpenState] = useState(defaultOpen)
	const [isExpanded, setIsExpanded] = useState(false)
	const [inputValue, setInputValue] = useState("")
	const [theme, setTheme] = useState<WidgetTheme>(defaultTheme)

	const isRightPosition = position === "right"
	const isDark = theme === "dark"

	const setIsOpen = useCallback(
		(value: boolean) => {
			setIsOpenState(value)
			onOpenChange?.(value)
		},
		[onOpenChange],
	)

	const toggleOpen = useCallback(() => {
		setIsOpenState((prev) => {
			const next = !prev
			onOpenChange?.(next)
			return next
		})
	}, [onOpenChange])

	const toggleExpanded = useCallback(() => {
		setIsExpanded((prev) => !prev)
	}, [])

	const toggleTheme = useCallback(() => {
		setTheme((prev) => {
			const next = prev === "light" ? "dark" : "light"
			safeSetItem(THEME_STORAGE_KEY, next)
			return next
		})
	}, [])

	return {
		isOpen,
		isExpanded,
		inputValue,
		setInputValue,
		isRightPosition,
		theme,
		isDark,
		setIsOpen,
		toggleOpen,
		toggleExpanded,
		toggleTheme,
	}
}
