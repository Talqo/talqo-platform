import type { RefObject } from "react";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatTypingIndicator } from "./ChatTypingIndicator";

interface Message {
	id: string;
	role: "user" | "bot";
	content: string;
}

interface ChatMessageListProps {
	messages: Message[];
	isTyping: boolean;
	isDark: boolean;
	messagesEndRef: RefObject<HTMLDivElement | null>;
}

export function ChatMessageList(props: ChatMessageListProps) {
	const { messages, isTyping, isDark, messagesEndRef } = props;

	return (
		<div
			className={`widget-scrollbar flex-1 overflow-y-auto p-4 ${
				isDark ? "bg-zinc-950" : "bg-white"
			}`}
			style={{
				scrollbarWidth: "thin",
				scrollbarColor: isDark
					? "rgba(100,100,100,0.3) transparent"
					: "rgba(150,150,150,0.3) transparent",
			}}
		>
			<div className="space-y-4">
				{messages.map((msg) => (
					<ChatMessageBubble
						key={msg.id}
						content={msg.content}
						role={msg.role}
						isDark={isDark}
					/>
				))}
				{isTyping && <ChatTypingIndicator isDark={isDark} />}
				<div ref={messagesEndRef} />
			</div>
		</div>
	);
}
