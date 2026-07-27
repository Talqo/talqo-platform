import "./theme/tokens.css";

export type EmbeddedWidgetProps = {
	title?: string;
	placeholder?: string;
};

export const EmbeddedWidget = ({
	title = "AI Chat",
	placeholder = "Type a message...",
}: EmbeddedWidgetProps) => {
	return (
		<div className="talqo-widget">
			<button
				type="button"
				className="talqo-widget__trigger"
				aria-label="Open chat"
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
			<div className="talqo-widget__panel">
				<header className="talqo-widget__header">
					<h2 className="talqo-widget__title">{title}</h2>
				</header>
				<div className="talqo-widget__messages">
					<p className="talqo-widget__empty">How can I help you today?</p>
				</div>
				<form className="talqo-widget__form">
					<input
						type="text"
						className="talqo-widget__input"
						placeholder={placeholder}
						aria-label="Message"
					/>
					<button type="submit" className="talqo-widget__send">
						Send
					</button>
				</form>
			</div>
		</div>
	);
};
