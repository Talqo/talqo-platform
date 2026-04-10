// Headless widget - state and primitives only, no styles

// Hooks
export {
	type UseWidgetOptions,
	type UseWidgetReturn,
	useWidget,
	useWidgetTheme,
} from "./hooks"
// Types
export type { Message } from "./hooks/useWidget"
export type { WidgetTheme } from "./hooks/useWidgetTheme"
// Primitives - unstyled, compose your own UI
export {
	useWidgetContext,
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
// Icons - useful for building custom UIs
export {
	BotIcon,
	ClearIcon,
	CloseIcon,
	ExpandIcon,
	MinimizeIcon,
	MoonIcon,
	SendIcon,
	SunIcon,
	XLargeIcon,
} from "./primitives/icons"

/**
 * Quick Start:
 *
 * For a pre-styled widget (default theme):
 * ```tsx
 * import { WidgetRoot, WidgetTrigger, WidgetPanel } from "widget";
 * import "widget/theme/default.css";
 *
 * // Or compose with the StyledWidget component in your app
 * ```
 *
 * For full control (headless):
 * ```tsx
 * import { useWidget, WidgetRoot, WidgetTrigger } from "widget";
 * // No CSS import - you bring your own styles
 *
 * function MyWidget() {
 *   const widget = useWidget({ defaultOpen: false });
 *   return (
 *     <Widget.Root {...widget}>
 *       <Widget.Trigger>Open Chat</Widget.Trigger>
 *       <Widget.Panel>
 *       <Widget.Header>
 *         <h3>Chat with us</h3>
 *         <button onClick={widget.clearMessages}>Clear</button>
 *       </Widget.Header>
 *       <Widget.MessageList>
 *         {widget.messages.map((msg) => (
 *           <Widget.Message key={msg.id} role={msg.role}>
 *             {msg.content}
 *           </Widget.Message>
 *         ))}
 *         {widget.isTyping && <Widget.TypingIndicator />}
 *       </Widget.MessageList>
 *       <div>
 *         <Widget.Input placeholder="Type a message..." />
 *         <Widget.SendButton>Send</Widget.SendButton>
 *       </div>
 *     </Widget.Panel>
 *   );
 * }
 * ```
 */
