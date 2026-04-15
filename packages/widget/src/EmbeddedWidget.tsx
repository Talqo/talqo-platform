import {
	WidgetHeader,
	WidgetInput,
	WidgetMessage,
	WidgetMessageList,
	WidgetPanel,
	WidgetRoot,
	WidgetSendButton,
	WidgetTrigger,
	WidgetTypingIndicator,
} from "./primitives"
import {
	BotIcon,
	ClearIcon,
	ExpandIcon,
	MinimizeIcon,
	SendIcon,
	XLargeIcon,
} from "./primitives/icons"
import { useWidgetContext } from "./primitives/WidgetRoot"
import type { ResolvedWidgetConfig } from "./types"

interface EmbeddedWidgetProps {
	config: ResolvedWidgetConfig
}

/**
 * Inner component that consumes widget context.
 * Must be rendered inside WidgetRoot.
 */
function EmbeddedWidgetInner({ config }: EmbeddedWidgetProps) {
	const widget = useWidgetContext()

	return (
		<div className={"aiw-root"} data-position={config.position}>
			{/* Only show trigger button when widget is closed */}
			{!widget.isOpen && (
				<WidgetTrigger
					className={"aiw-trigger"}
					closedContent={<BotIcon size={28} />}
				/>
			)}

			<WidgetPanel className={"aiw-panel"} data-expanded={widget.isExpanded}>
				<WidgetHeader className={"aiw-header"}>
					<div className={"aiw-header-left"}>
						<BotIcon size={24} />
						<span className={"aiw-header-title"}>AI Assistant</span>
					</div>
					<div className={"aiw-header-actions"}>
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
							{msg.role === "bot" && (
								<div className={"aiw-message-avatar"}>
									<BotIcon size={20} />
								</div>
							)}
							<div className={"aiw-message-content"}>{msg.content}</div>
						</WidgetMessage>
					))}
					{widget.isTyping && (
						<WidgetTypingIndicator className={"aiw-typing"} />
					)}
				</WidgetMessageList>

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
		<WidgetRoot defaultOpen={config.defaultOpen} position={config.position}>
			<EmbeddedWidgetInner config={config} />
		</WidgetRoot>
	)
}
