import { useCallback, useEffect, useRef, useState } from "react";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { ChatMessageList } from "./ChatMessageList";
import { BotIcon, XLargeIcon } from "./icons";
import { useWidgetTheme } from "./useWidgetTheme";

export interface WidgetProps {
	/** Optional className for styling overrides - use for positioning like "left-6 right-auto" */
	className?: string;
	/** Position of the widget - affects send button placement. "right" (default) puts button on left, "left" puts button on right */
	position?: "left" | "right";
}

interface Message {
	id: string;
	role: "user" | "bot";
	content: string;
}

export function Widget(props: WidgetProps) {
	const { className, position = "right" } = props;
	const isRightPosition = position === "right";
	const [isOpen, setIsOpen] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [messages, setMessages] = useState<Message[]>([
		{
			id: "welcome",
			role: "bot",
			content: "Hi! How can I help you today?",
		},
	]);
	const [isTyping, setIsTyping] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { theme, isDark } = useWidgetTheme();

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	// Auto-scroll to bottom when messages change or when reopening
	// biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally scroll on messages and open state changes
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isOpen]);

	const handleSend = useCallback(() => {
		if (!inputValue.trim() || isTyping) return;

		const userMsg: Message = {
			id: Date.now().toString(),
			role: "user",
			content: inputValue.trim(),
		};
		setMessages((prev) => [...prev, userMsg]);
		setInputValue("");
		setIsTyping(true);

		// Simulate bot response
		timeoutRef.current = setTimeout(() => {
			const botMsg: Message = {
				id: (Date.now() + 1).toString(),
				role: "bot",
				content: "Thanks for your message! Our team will get back to you soon.",
			};
			setMessages((prev) => [...prev, botMsg]);
			setIsTyping(false);
			timeoutRef.current = null;
		}, 1500);
	}, [inputValue, isTyping]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (!inputValue.trim()) return;
			handleSend();
		}
	};

	const toggleExpanded = () => {
		setIsExpanded((prev) => !prev);
	};

	const clearMessages = () => {
		// Cancel any pending bot response
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		setIsTyping(false);
		setMessages([
			{
				id: "welcome",
				role: "bot",
				content: "Hi! How can I help you today?",
			},
		]);
	};

	const chatContainerClasses = isDark
		? "bg-zinc-950 ring-zinc-800"
		: "bg-white ring-zinc-200";

	return (
		<div
			className={[
				"fixed z-50 flex flex-col items-end",
				isRightPosition ? "right-6 bottom-6" : "bottom-6 left-6",
				theme,
				className,
			]
				.filter(Boolean)
				.join(" ")}
			style={{
				fontFamily:
					'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
			}}
		>
			{isOpen && (
				<div
					id="chat-panel"
					className={`mb-3 flex max-h-[80vh] w-[90vw] flex-col overflow-hidden rounded-2xl shadow-2xl ring-1 transition-all duration-300 sm:w-[400px] md:w-[450px] lg:w-[500px] ${chatContainerClasses}`}
					style={{
						height: isExpanded ? "80vh" : "500px",
						maxWidth: "min(600px, calc(100vw - 3rem))",
					}}
				>
					<ChatHeader
						isDark={isDark}
						isExpanded={isExpanded}
						onClear={clearMessages}
						onToggleExpand={toggleExpanded}
						onClose={() => setIsOpen(false)}
					/>

					<ChatMessageList
						messages={messages}
						isTyping={isTyping}
						isDark={isDark}
						messagesEndRef={messagesEndRef}
					/>

					<ChatInput
						inputValue={inputValue}
						isDark={isDark}
						isRightPosition={isRightPosition}
						onInputChange={setInputValue}
						onSend={handleSend}
						onKeyDown={handleKeyDown}
					/>
				</div>
			)}

			<button
				type="button"
				onClick={() => setIsOpen((prev) => !prev)}
				className={`flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl transition-transform hover:scale-105 active:scale-95 ${
					isOpen ? "" : "animate-pulse"
				}`}
				aria-expanded={isOpen}
				aria-controls={isOpen ? "chat-panel" : undefined}
				aria-label={isOpen ? "Close chat" : "Open chat"}
			>
				{isOpen ? <XLargeIcon /> : <BotIcon size={28} />}
			</button>
		</div>
	);
}
