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

/**
 * Inner component that consumes widget context.
 * Must be rendered inside WidgetRoot.
 */
function EmbeddedWidgetInner({ config }: EmbeddedWidgetProps) {
	const widget = useWidgetContext()
	const botAvatarSvg = config.icons.botAvatar

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

			<WidgetPanel className={"aiw-panel"} data-expanded={widget.isExpanded}>
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
							onClick={widget.toggleExpanded}
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
				</WidgetMessageList>

				{widget.error && (
					<div className={"aiw-error"} role="alert">
						{widget.error}
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
