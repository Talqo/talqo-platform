interface ChatMessageBubbleProps {
	content: string;
	role: "user" | "bot";
	isDark: boolean;
}

export function ChatMessageBubble(props: ChatMessageBubbleProps) {
	const { content, role, isDark } = props;

	return (
		<div
			className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}
		>
			<div
				className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
					role === "user"
						? "bg-primary text-primary-foreground"
						: isDark
							? "bg-zinc-900 text-zinc-50"
							: "bg-zinc-100 text-zinc-900"
				}`}
			>
				{content}
			</div>
		</div>
	);
}
