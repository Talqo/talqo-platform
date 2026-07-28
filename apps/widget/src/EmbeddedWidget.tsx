import { type FormEvent, useState } from "react";
import { Bubble, BubbleContent, BubbleGroup } from "@/components/ui/bubble";
import { cn } from "@/lib/utils";
import "./index.css";
import "./theme/tokens.css";

export type EmbeddedWidgetProps = {
	title?: string;
	placeholder?: string;
	greeting?: string;
};

type Message = {
	id: number;
	from: "assistant" | "user";
	text: string;
};

export const EmbeddedWidget = ({
	title = "AI Chat",
	placeholder = "Type a message...",
	greeting = "Hi there! How can I help you today?",
}: EmbeddedWidgetProps) => {
	const [open, setOpen] = useState(false);
	const [messages, setMessages] = useState<Message[]>([
		{ id: 1, from: "assistant", text: greeting },
	]);
	const [draft, setDraft] = useState("");

	function handleSend(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const text = draft.trim();
		if (!text) {
			return;
		}
		setMessages((prev) => [...prev, { id: Date.now(), from: "user", text }]);
		setDraft("");
	}

	return (
		<div className="talqo-widget flex flex-col items-end gap-3 font-sans text-foreground">
			{open && (
				<div
					role="dialog"
					aria-label={title}
					className="flex h-96 w-80 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg"
				>
					<header className="flex items-center justify-between border-border border-b px-4 py-3">
						<h2 className="font-semibold text-sm">{title}</h2>
						<button
							type="button"
							onClick={() => setOpen(false)}
							aria-label="Close chat"
							className="text-muted-foreground transition-colors hover:text-foreground"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								role="img"
							>
								<title>Close</title>
								<path d="M18 6 6 18" />
								<path d="m6 6 12 12" />
							</svg>
						</button>
					</header>
					<div className="flex-1 overflow-y-auto p-3">
						<BubbleGroup>
							{messages.map((message) => (
								<Bubble
									key={message.id}
									variant={message.from === "user" ? "default" : "muted"}
									align={message.from === "user" ? "end" : "start"}
								>
									<BubbleContent
										className={cn(
											message.from === "assistant" && "text-foreground",
										)}
									>
										{message.text}
									</BubbleContent>
								</Bubble>
							))}
						</BubbleGroup>
					</div>
					<form
						onSubmit={handleSend}
						className="flex items-center gap-2 border-border border-t p-3"
					>
						<input
							type="text"
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							placeholder={placeholder}
							aria-label="Message"
							className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
						/>
						<button
							type="submit"
							className="shrink-0 rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
						>
							Send
						</button>
					</form>
				</div>
			)}
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				aria-label={open ? "Close chat" : "Open chat"}
				aria-expanded={open}
				className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					role="img"
				>
					<title>Chat icon</title>
					<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
				</svg>
			</button>
		</div>
	);
};
