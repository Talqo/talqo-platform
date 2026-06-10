import { useCallback, useRef, useState } from "react"

export function useResizable(position: "left" | "right") {
	const panelRef = useRef<HTMLDivElement>(null)
	const startRef = useRef<{
		x: number
		y: number
		w: number
		h: number
	} | null>(null)
	const [panelHeight, setPanelHeight] = useState<number | null>(null)
	const [panelWidth, setPanelWidth] = useState<number | null>(null)

	const onResizeStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (!panelRef.current) return
		e.preventDefault()
		e.currentTarget.setPointerCapture(e.pointerId)
		panelRef.current.dataset.resizing = "true"
		const rect = panelRef.current.getBoundingClientRect()
		startRef.current = {
			x: e.clientX,
			y: e.clientY,
			w: rect.width,
			h: rect.height,
		}
	}, [])

	const onResizeMove = useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			const start = startRef.current
			if (!start || !panelRef.current) return
			const dy = e.clientY - start.y
			const dx = e.clientX - start.x
			const newHeight = Math.max(
				300,
				Math.min(window.innerHeight * 0.85, start.h - dy),
			)
			const delta = position === "right" ? -dx : dx
			const newWidth = Math.max(
				280,
				Math.min(window.innerWidth * 0.9, start.w + delta),
			)
			panelRef.current.style.height = `${newHeight}px`
			panelRef.current.style.maxHeight = `${newHeight}px`
			panelRef.current.style.width = `${newWidth}px`
			panelRef.current.style.maxWidth = `${newWidth}px`
			panelRef.current.dataset.size =
				newWidth >= 560 ? "xl" : newWidth >= 460 ? "lg" : ""
		},
		[position],
	)

	const onResizeEnd = useCallback(() => {
		if (!startRef.current || !panelRef.current) {
			startRef.current = null
			return
		}
		startRef.current = null
		delete panelRef.current.dataset.resizing
		const s = panelRef.current.style
		if (s.height) setPanelHeight(Number.parseFloat(s.height))
		if (s.width) setPanelWidth(Number.parseFloat(s.width))
	}, [])

	const onHeaderPointerDown = useCallback(
		(e: React.PointerEvent<HTMLElement>) => {
			const target = e.target as HTMLElement
			if (target.closest("button")) return
			onResizeStart(e as unknown as React.PointerEvent<HTMLDivElement>)
		},
		[onResizeStart],
	)

	const resetSize = useCallback(() => {
		setPanelHeight(null)
		setPanelWidth(null)
		if (panelRef.current) {
			panelRef.current.style.height = ""
			panelRef.current.style.maxHeight = ""
			panelRef.current.style.width = ""
			panelRef.current.style.maxWidth = ""
			panelRef.current.dataset.size = ""
		}
	}, [])

	const panelStyle: React.CSSProperties = {
		...(panelHeight !== null
			? { height: panelHeight, maxHeight: panelHeight }
			: {}),
		...(panelWidth !== null ? { width: panelWidth, maxWidth: panelWidth } : {}),
	}

	const headerHandleProps = {
		onPointerDown: onHeaderPointerDown,
		onPointerMove: onResizeMove,
		onPointerUp: onResizeEnd,
		onPointerCancel: onResizeEnd,
		onLostPointerCapture: onResizeEnd,
	}

	return {
		panelRef,
		panelStyle: Object.keys(panelStyle).length ? panelStyle : undefined,
		resetSize,
		cornerHandleProps: {
			onPointerDown: onResizeStart,
			onPointerMove: onResizeMove,
			onPointerUp: onResizeEnd,
			onPointerCancel: onResizeEnd,
			onLostPointerCapture: onResizeEnd,
		},
		headerHandleProps,
	}
}
