import { type FormEvent, useEffect, useRef, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { Bubble, BubbleContent, BubbleGroup } from "./components/ui/bubble";
import {
	createWidgetI18n,
	isWidgetLanguage,
	type WidgetLanguage,
} from "./lib/i18n";
import { cn } from "./lib/utils";
import "./index.css";

export type EmbeddedWidgetProps = {
	title?: string;
	language?: WidgetLanguage;
	botId?: string;
};

type Message = {
	id: number;
	from: "assistant" | "user";
	// Seed messages carry an i18n key so they re-translate on language switch;
	// user messages are plain text.
	text?: string;
	i18nKey?: string;
};

function WidgetChat({
	title = "AI Chat",
	botId,
}: {
	title?: string;
	botId?: string;
}) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const [messages, setMessages] = useState<Message[]>([
		{ id: 1, from: "assistant", i18nKey: "greeting" },
	]);
	const [draft, setDraft] = useState("");
	const nextId = useRef(2);

	function handleSend(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const text = draft.trim();
		if (!text) {
			return;
		}
		setMessages((prev) => [
			...prev,
			{ id: nextId.current++, from: "user", text },
		]);
		setDraft("");
	}

	return (
		<div
			className="talqo-widget flex flex-col items-end gap-3 font-sans text-foreground"
			data-bot={botId}
		>
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
							aria-label={t("closeChat")}
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
								<title>{t("close")}</title>
								<path d="M18 6 6 18" />
								<path d="m6 6 12 12" />
							</svg>
						</button>
					</header>
					<div className="flex-1 overflow-y-auto p-3" aria-live="polite">
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
										{message.i18nKey ? t(message.i18nKey) : message.text}
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
							placeholder={t("placeholder")}
							aria-label={t("messageLabel")}
							className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
						/>
						<button
							type="submit"
							className="shrink-0 rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
						>
							{t("send")}
						</button>
					</form>
				</div>
			)}
			<button
				type="button"
				onClick={() => setOpen((prev) => !prev)}
				aria-label={open ? t("closeChat") : t("openChat")}
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
					<title>{t("chatIcon")}</title>
					<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
				</svg>
			</button>
		</div>
	);
}

export const EmbeddedWidget = ({
	title = "AI Chat",
	language = "en",
	botId,
}: EmbeddedWidgetProps) => {
	const [i18n] = useState(() =>
		createWidgetI18n(isWidgetLanguage(language) ? language : "en"),
	);

	useEffect(() => {
		if (isWidgetLanguage(language)) {
			i18n.changeLanguage(language);
		}
	}, [i18n, language]);

	return (
		<I18nextProvider i18n={i18n}>
			<WidgetChat title={title} botId={botId} />
		</I18nextProvider>
	);
};
