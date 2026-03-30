import { SendIcon } from "./icons";

interface ChatInputProps {
	inputValue: string;
	isDark: boolean;
	isRightPosition: boolean;
	onInputChange: (value: string) => void;
	onSend: () => void;
	onKeyDown: (e: React.KeyboardEvent) => void;
}

export function ChatInput(props: ChatInputProps) {
	const {
		inputValue,
		isDark,
		isRightPosition,
		onInputChange,
		onSend,
		onKeyDown,
	} = props;

	return (
		<div
			className={`border-t p-4 ${
				isDark ? "border-zinc-800 bg-zinc-950" : "border-zinc-100 bg-white"
			}`}
		>
			<div
				className={`flex items-center gap-2 ${isRightPosition ? "flex-row-reverse" : ""}`}
			>
				<input
					type="text"
					value={inputValue}
					onChange={(e) => onInputChange(e.target.value)}
					onKeyDown={onKeyDown}
					placeholder="Type your message..."
					aria-label="Type your message"
					className={`flex-1 rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
						isDark
							? "border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
							: "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-500"
					}`}
				/>
				<button
					type="button"
					onClick={onSend}
					disabled={!inputValue.trim()}
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[3px] border-primary bg-primary text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
					aria-label="Send message"
				>
					<SendIcon size={18} />
				</button>
			</div>
			<p
				className={`mt-2 text-center text-[10px] ${isDark ? "text-zinc-500" : "text-zinc-400"}`}
			>
				Powered by PagePal
			</p>
		</div>
	);
}
