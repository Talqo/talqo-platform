import { SendIcon, WidgetInput, WidgetSendButton } from "widget"
import { cn } from "@/lib/utils"

interface ChatInputProps {
	isDark: boolean
	isRightPosition: boolean
}

export function ChatInput({ isDark }: ChatInputProps) {
	return (
		<div className="flex items-center gap-2">
			<WidgetInput
				placeholder="Type your message..."
				className={cn(
					"flex-1 rounded-full border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary",
					isDark
						? "border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
						: "border-zinc-200 bg-zinc-50 text-zinc-900 placeholder:text-zinc-500",
				)}
			/>
			<WidgetSendButton
				className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-[3px] border-primary bg-primary text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
				aria-label="Send message"
			>
				<SendIcon size={18} />
			</WidgetSendButton>
		</div>
	)
}
