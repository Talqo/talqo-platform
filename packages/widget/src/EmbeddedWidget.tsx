import { useCallback, useRef, useState } from "react"
import { getInitialTheme } from "./hooks/useWidget"
import {
	WidgetHeader,
	WidgetInput,
	WidgetMarkdownContent,
	WidgetMessage,
	WidgetMessageList,
	WidgetPanel,
	WidgetRoot,
	WidgetSendButton,
	WidgetTrigger,
	WidgetTypingIndicator,
} from "./primitives"
import {
	AvatarIcon,
	ClearIcon,
	ExpandIcon,
	MinimizeIcon,
	MoonIcon,
	SendIcon,
	SunIcon,
	XLargeIcon,
} from "./primitives/icons"
import { useWidgetContext } from "./primitives/WidgetRoot"
import type { ResolvedWidgetConfig } from "./types"

type EmbeddedWidgetProps = {
	config: ResolvedWidgetConfig
}

function useDraggable() {
	const rootRef = useRef<HTMLDivElement>(null)
	const dragState = useRef<{ startX: number; startLeft: number } | null>(null)
	const didDrag = useRef(false)
	const [posX, setPosX] = useState<number | null>(null)

	const onPointerDown = useCallback((e: React.PointerEvent) => {
		if (!rootRef.current) return
		e.currentTarget.setPointerCapture(e.pointerId)
		didDrag.current = false
		dragState.current = {
			startX: e.clientX,
			startLeft: rootRef.current.getBoundingClientRect().left,
		}
	}, [])

	const onPointerMove = useCallback((e: React.PointerEvent) => {
		const state = dragState.current
		if (!state || !rootRef.current) return
		const dx = e.clientX - state.startX
		if (Math.abs(dx) < 5) return
		didDrag.current = true
		const maxLeft = window.innerWidth - rootRef.current.offsetWidth
		const newLeft = Math.max(0, Math.min(maxLeft, state.startLeft + dx))
		rootRef.current.style.left = `${newLeft}px`
		rootRef.current.style.right = "auto"
	}, [])

	const onPointerUp = useCallback((e: React.PointerEvent) => {
		const state = dragState.current
		dragState.current = null
		if (!state || !rootRef.current || !didDrag.current) return
		const dx = e.clientX - state.startX
		const maxLeft = window.innerWidth - rootRef.current.offsetWidth
		setPosX(Math.max(0, Math.min(maxLeft, state.startLeft + dx)))
	}, [])

	const onHeaderPointerDown = useCallback(
		(e: React.PointerEvent) => {
			if ((e.target as HTMLElement).closest("button")) return
			onPointerDown(e)
		},
		[onPointerDown],
	)

	const rootStyle: React.CSSProperties =
		posX !== null ? { left: posX, right: "auto" } : {}

	return {
		rootRef,
		rootStyle,
		didDrag,
		triggerDragProps: { onPointerDown, onPointerMove, onPointerUp },
		headerDragProps: {
			onPointerDown: onHeaderPointerDown,
			onPointerMove,
			onPointerUp,
		},
	}
}

function useResizable() {
	const panelRef = useRef<HTMLDivElement>(null)
	const startRef = useRef<{ y: number; h: number } | null>(null)
	const [panelHeight, setPanelHeight] = useState<number | null>(null)

	const onResizeStart = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		if (!panelRef.current) return
		e.preventDefault()
		e.currentTarget.setPointerCapture(e.pointerId)
		const rect = panelRef.current.getBoundingClientRect()
		startRef.current = { y: e.clientY, h: rect.height }
	}, [])

	const onResizeMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
		const start = startRef.current
		if (!start || !panelRef.current) return
		const dy = e.clientY - start.y
		const newHeight = Math.max(
			300,
			Math.min(window.innerHeight * 0.85, start.h - dy),
		)
		// Update DOM directly for smooth resize without React re-renders
		panelRef.current.style.height = `${newHeight}px`
		panelRef.current.style.maxHeight = `${newHeight}px`
	}, [])

	const onResizeEnd = useCallback(() => {
		if (!startRef.current || !panelRef.current) {
			startRef.current = null
			return
		}
		startRef.current = null
		const s = panelRef.current.style
		if (s.height) {
			setPanelHeight(Number.parseFloat(s.height))
		}
	}, [])

	const resetSize = useCallback(() => {
		setPanelHeight(null)
		if (panelRef.current) {
			panelRef.current.style.height = ""
			panelRef.current.style.maxHeight = ""
		}
	}, [])

	const panelStyle: React.CSSProperties | undefined =
		panelHeight !== null
			? { height: panelHeight, maxHeight: panelHeight }
			: undefined

	return {
		panelRef,
		panelStyle,
		resetSize,
		handleProps: {
			onPointerDown: onResizeStart,
			onPointerMove: onResizeMove,
			onPointerUp: onResizeEnd,
		},
	}
}

/**
 * Inner component that consumes widget context.
 * Must be rendered inside WidgetRoot.
 */
function EmbeddedWidgetInner({ config }: EmbeddedWidgetProps) {
	const widget = useWidgetContext()
	const botAvatarSvg = config.icons.botAvatar
	const { panelRef, panelStyle, resetSize, handleProps } = useResizable()
	const { rootRef, rootStyle, didDrag, triggerDragProps, headerDragProps } =
		useDraggable()

	const handleToggleExpanded = useCallback(() => {
		widget.toggleExpanded()
		resetSize()
	}, [widget, resetSize])

	return (
		<div
			ref={rootRef}
			className={"aiw-root"}
			data-position={config.position}
			data-theme={widget.isDark ? "dark" : "light"}
			style={rootStyle}
		>
			{/* Only show trigger button when widget is closed */}
			{!widget.isOpen && (
				<WidgetTrigger
					className={"aiw-trigger"}
					closedContent={<AvatarIcon size={28} iconSvg={botAvatarSvg} />}
					onClick={() => {
						if (didDrag.current) {
							didDrag.current = false
							return
						}
						widget.toggleOpen()
					}}
					{...triggerDragProps}
				/>
			)}

			<WidgetPanel
				className={"aiw-panel"}
				data-expanded={widget.isExpanded}
				aria-label={config.botName}
				ref={panelRef}
				style={panelStyle}
			>
				{/* Drag handle for resizing */}
				<div
					className={"aiw-resize-handle"}
					aria-hidden="true"
					{...handleProps}
				/>

				<WidgetHeader className={"aiw-header"} {...headerDragProps}>
					<div className={"aiw-header-left"}>
						<AvatarIcon size={24} iconSvg={botAvatarSvg} />
						<span className={"aiw-header-title"}>{config.botName}</span>
					</div>
					<div className={"aiw-header-actions"}>
						<button
							type="button"
							className={"aiw-icon-btn"}
							onClick={widget.toggleTheme}
							aria-label={
								widget.isDark ? "Switch to light mode" : "Switch to dark mode"
							}
						>
							{widget.isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
						</button>
						<button
							type="button"
							className={"aiw-icon-btn"}
							onClick={handleToggleExpanded}
							aria-label={widget.isExpanded ? "Minimize" : "Expand"}
						>
							{widget.isExpanded ? (
								<MinimizeIcon size={18} />
							) : (
								<ExpandIcon size={18} />
							)}
						</button>
						<button
							type="button"
							className={"aiw-icon-btn"}
							onClick={widget.clearMessages}
							aria-label="Clear conversation"
						>
							<ClearIcon size={18} />
						</button>
						<button
							type="button"
							className={"aiw-icon-btn"}
							onClick={widget.toggleOpen}
							aria-label="Close"
						>
							<XLargeIcon size={20} />
						</button>
					</div>
				</WidgetHeader>

				<WidgetMessageList className={"aiw-message-list"}>
					{widget.messages.map((msg) => (
						<WidgetMessage
							key={msg.id}
							role={msg.role}
							className={"aiw-message"}
						>
							{msg.role === "assistant" && (
								<div className={"aiw-message-avatar"}>
									<AvatarIcon size={20} iconSvg={botAvatarSvg} />
								</div>
							)}
							<div className={"aiw-message-content"}>
								{msg.role === "assistant" ? (
									<WidgetMarkdownContent content={msg.content} />
								) : (
									msg.content
								)}
							</div>
						</WidgetMessage>
					))}
					{widget.isTyping && (
						<WidgetTypingIndicator className={"aiw-typing"} />
					)}
					{widget.showRatingPrompt && (
						<div className={"aiw-rating"}>
							<p>
								{widget.ratingSubmitted
									? "Thank you for your feedback!"
									: "Rate this conversation"}
							</p>
							<div className={"aiw-rating-stars"}>
								{[1, 2, 3, 4, 5].map((star) => (
									<button
										key={star}
										type="button"
										onClick={() =>
											!widget.ratingSubmitted && widget.submitRating(star)
										}
										disabled={widget.ratingSubmitted}
										data-filled={
											widget.submittedRatingValue !== null &&
											star <= widget.submittedRatingValue
										}
										aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
									>
										★
									</button>
								))}
							</div>
						</div>
					)}
				</WidgetMessageList>

				{widget.error && (
					<div className={"aiw-error"} role="alert">
						<span>{widget.error}</span>
						<button
							type="button"
							className={"aiw-error-dismiss"}
							onClick={widget.clearError}
							aria-label="Dismiss error"
						>
							×
						</button>
					</div>
				)}

				<div className={"aiw-input-area"}>
					<WidgetInput
						className={"aiw-input"}
						placeholder="Type a message..."
					/>
					<WidgetSendButton className={"aiw-send-btn"}>
						<SendIcon size={18} />
					</WidgetSendButton>
				</div>

				<div className={"aiw-footer"}>
					<span>Powered by PagePal</span>
				</div>
			</WidgetPanel>
		</div>
	)
}

/**
 * Composed widget component with styles applied.
 * Uses WidgetRoot to provide state context and EmbeddedWidgetInner to consume it.
 */
export function EmbeddedWidget({ config }: EmbeddedWidgetProps) {
	return (
		<WidgetRoot
			defaultOpen={config.defaultOpen}
			position={config.position}
			defaultTheme={getInitialTheme()}
			apiConfig={{ widgetToken: config.widgetToken, apiUrl: config.apiUrl }}
		>
			<EmbeddedWidgetInner config={config} />
		</WidgetRoot>
	)
}
