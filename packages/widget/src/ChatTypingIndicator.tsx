interface ChatTypingIndicatorProps {
	isDark: boolean;
}

export function ChatTypingIndicator(props: ChatTypingIndicatorProps) {
	const { isDark } = props;

	return (
		<div className="flex justify-start">
			<div
				className={`flex max-w-[85%] gap-1 rounded-2xl px-4 py-3 ${
					isDark ? "bg-zinc-900" : "bg-zinc-100"
				}`}
				aria-live="polite"
				aria-atomic="true"
			>
				<span className="sr-only">Assistant is typing</span>
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400"
						style={{ animationDelay: `${i * 0.15}s` }}
						aria-hidden="true"
					/>
				))}
			</div>
		</div>
	);
}
