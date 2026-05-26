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

function useResizable(position: "left" | "right") {
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
			// Right-positioned: corner is top-left, drag left = wider (dx negative)
			// Left-positioned: corner is top-right, drag right = wider (dx positive)
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

	return {
		panelRef,
		panelStyle: Object.keys(panelStyle).length ? panelStyle : undefined,
		resetSize,
		cornerHandleProps: {
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
	const { panelRef, panelStyle, cornerHandleProps } = useResizable(
		config.position,
	)

	return (
		<div
			className={"aiw-root"}
			data-position={config.position}
			data-theme={widget.isDark ? "dark" : "light"}
		>
			{/* Only show trigger button when widget is closed */}
			{!widget.isOpen && (
				<WidgetTrigger
					className={"aiw-trigger"}
					closedContent={<AvatarIcon size={28} iconSvg={botAvatarSvg} />}
				/>
			)}

			<WidgetPanel
				className={"aiw-panel"}
				data-expanded={widget.isExpanded}
				aria-label={config.botName}
				ref={panelRef}
				style={panelStyle}
			>
				{/* Corner handle — drag to resize both width and height */}
				<div
					className={"aiw-resize-corner"}
					aria-hidden="true"
					{...cornerHandleProps}
				/>

				<WidgetHeader className={"aiw-header"}>
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
