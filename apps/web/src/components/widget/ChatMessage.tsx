import type { Message } from "widget";
import { WidgetMessage } from "widget";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
	message: Message;
	isDark: boolean;
}

export function ChatMessage({ message, isDark }: ChatMessageProps) {
	return (
		<WidgetMessage
			role={message.role}
			className={cn(
				"flex",
				message.role === "user" ? "justify-end" : "justify-start",
			)}
		>
			<div
				className={cn(
					"max-w-[85%] rounded-2xl px-4 py-2 text-sm",
					message.role === "user"
						? "bg-primary text-white"
						: isDark
							? "bg-zinc-900 text-zinc-50"
							: "bg-zinc-100 text-zinc-900",
				)}
			>
				{message.content}
			</div>
		</WidgetMessage>
	);
}
