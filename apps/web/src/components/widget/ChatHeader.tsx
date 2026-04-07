import {
	BotIcon,
	ClearIcon,
	CloseIcon,
	ExpandIcon,
	MinimizeIcon,
} from "widget";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
	isDark: boolean;
	onClearMessages: () => void;
	onToggleExpanded: () => void;
	onToggleOpen: () => void;
	isExpanded: boolean;
}

export function ChatHeader({
	isDark,
	onClearMessages,
	onToggleExpanded,
	onToggleOpen,
	isExpanded,
}: ChatHeaderProps) {
	return (
		<div
			className={cn(
				"flex items-center justify-between border-b px-4 py-3",
				isDark ? "border-zinc-800 bg-zinc-900" : "border-zinc-100 bg-zinc-50",
			)}
		>
			<div className="flex items-center gap-2">
				<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
					<BotIcon size={18} />
				</div>
				<div>
					<h3
						className={cn(
							"font-semibold text-sm",
							isDark ? "text-zinc-50" : "text-zinc-900",
						)}
					>
						Support Assistant
					</h3>
					<p
						className={cn(
							"text-xs",
							isDark ? "text-green-500" : "text-green-600",
						)}
					>
						Online
					</p>
				</div>
			</div>
			<div
				className={cn(
					"flex items-center gap-1",
					isDark ? "text-zinc-400" : "text-zinc-500",
				)}
			>
				<button
					type="button"
					onClick={onClearMessages}
					className={cn(
						"rounded-md p-1.5",
						isDark ? "hover:bg-zinc-800" : "hover:bg-zinc-200",
					)}
					title="Clear chat"
					aria-label="Clear chat history"
				>
					<ClearIcon />
				</button>
				<button
					type="button"
					onClick={onToggleExpanded}
					className={cn(
						"rounded-md p-1.5",
						isDark ? "hover:bg-zinc-800" : "hover:bg-zinc-200",
					)}
					title={isExpanded ? "Minimize" : "Expand"}
					aria-label={isExpanded ? "Minimize chat" : "Expand chat"}
				>
					{isExpanded ? <MinimizeIcon /> : <ExpandIcon />}
				</button>
				<button
					type="button"
					onClick={onToggleOpen}
					className={cn(
						"rounded-md p-1.5",
						isDark ? "hover:bg-zinc-800" : "hover:bg-zinc-200",
					)}
					title="Close chat"
					aria-label="Close chat"
				>
					<CloseIcon />
				</button>
			</div>
		</div>
	);
}
