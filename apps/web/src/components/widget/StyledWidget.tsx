import { useEffect, useRef } from "react";
import {
	BotIcon,
	ClearIcon,
	CloseIcon,
	ExpandIcon,
	MinimizeIcon,
	SendIcon,
	useWidgetContext,
	useWidgetTheme,
	WidgetHeader,
	WidgetInput,
	WidgetMessage,
	WidgetMessageList,
	WidgetPanel,
	WidgetRoot,
	WidgetSendButton,
	WidgetTrigger,
	WidgetTypingIndicator,
	XLargeIcon,
} from "widget";
import { cn } from "@/lib/utils";

interface StyledWidgetProps {
	/** Optional className for positioning overrides */
	className?: string;
	/** Position of the widget */
	position?: "left" | "right";
}

export function StyledWidget(props: StyledWidgetProps) {
	const { className, position = "right" } = props;
	const isRightPosition = position === "right";
	const { theme, isDark } = useWidgetTheme();

	const positionClasses = isRightPosition
		? "right-6 bottom-6"
		: "left-6 bottom-6";

	return (
		<WidgetRoot position={position}>
			<StyledWidgetContent
				className={className}
				positionClasses={positionClasses}
				theme={theme}
				isDark={isDark}
				isRightPosition={isRightPosition}
			/>
		</WidgetRoot>
	);
}

interface StyledWidgetContentProps {
	className?: string;
	positionClasses: string;
	theme: string;
	isDark: boolean;
	isRightPosition: boolean;
}

function StyledWidgetContent(props: StyledWidgetContentProps) {
	const { className, positionClasses, theme, isDark, isRightPosition } = props;
	const widget = useWidgetContext();
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom when messages change or when reopening
	// biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally scroll on messages and open state changes
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [widget.messages, widget.isOpen]);

	return (
		<div
			className={cn(
				"fixed z-50 flex flex-col items-end",
				positionClasses,
				theme,
				className,
			)}
			data-position={isRightPosition ? "right" : "left"}
			style={{
				fontFamily:
					'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
			}}
		>
			<WidgetPanel
				className={cn(
					"mb-3 flex max-h-[80vh] w-[90vw] flex-col overflow-hidden rounded-2xl shadow-2xl ring-1 transition-all duration-300 sm:w-[400px] md:w-[450px] lg:w-[500px]",
					isDark ? "bg-zinc-950 ring-zinc-800" : "bg-white ring-zinc-200",
				)}
				style={{
					height: widget.isExpanded ? "80vh" : "500px",
					maxWidth: "min(600px, calc(100vw - 3rem))",
				}}
			>
				<WidgetHeader
					className={cn(
						"flex items-center justify-between border-b px-4 py-3",
						isDark
							? "border-zinc-800 bg-zinc-900"
							: "border-zinc-100 bg-zinc-50",
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
							onClick={widget.clearMessages}
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
							onClick={widget.toggleExpanded}
							className={cn(
								"rounded-md p-1.5",
								isDark ? "hover:bg-zinc-800" : "hover:bg-zinc-200",
							)}
							title={widget.isExpanded ? "Minimize" : "Expand"}
							aria-label={widget.isExpanded ? "Minimize chat" : "Expand chat"}
						>
							{widget.isExpanded ? <MinimizeIcon /> : <ExpandIcon />}
						</button>
						<button
							type="button"
							onClick={widget.toggleOpen}
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
				</WidgetHeader>

				<WidgetMessageList
					scrollRef={messagesEndRef}
					className={cn(
						"widget-scrollbar flex-1 overflow-y-auto p-4",
						isDark ? "bg-zinc-950" : "bg-white",
					)}
					style={{
						scrollbarWidth: "thin",
						scrollbarColor: isDark
							? "rgba(100,100,100,0.3) transparent"
							: "rgba(150,150,150,0.3) transparent",
					}}
				>
					<div className="space-y-4">
						{widget.messages.map((msg) => (
							<WidgetMessage
								key={msg.id}
								role={msg.role}
								className={cn(
									"flex",
									msg.role === "user" ? "justify-end" : "justify-start",
								)}
							>
								<div
									className={cn(
										"max-w-[85%] rounded-2xl px-4 py-2 text-sm",
										msg.role === "user"
											? "bg-primary text-white"
											: isDark
												? "bg-zinc-900 text-zinc-50"
												: "bg-zinc-100 text-zinc-900",
									)}
								>
									{msg.content}
								</div>
							</WidgetMessage>
						))}
						{widget.isTyping && (
							<WidgetTypingIndicator
								className={cn(
									"flex justify-start",
									isDark ? "text-zinc-400" : "text-zinc-500",
								)}
							>
								<div
									className={cn(
										"flex max-w-[85%] gap-1 rounded-2xl px-4 py-3",
										isDark ? "bg-zinc-900" : "bg-zinc-100",
									)}
								>
									{[0, 1, 2].map((i) => (
										<div
											key={i}
											className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400"
											style={{ animationDelay: `${i * 0.15}s` }}
										/>
									))}
								</div>
							</WidgetTypingIndicator>
						)}
					</div>
				</WidgetMessageList>

				<div
					className={cn(
						"border-t p-4",
						isDark ? "border-zinc-800 bg-zinc-950" : "border-zinc-100 bg-white",
					)}
				>
					<div
						className={cn(
							"flex items-center gap-2",
							isRightPosition ? "flex-row-reverse" : "",
						)}
					>
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
					<p
						className={cn(
							"mt-2 text-center text-[10px]",
							isDark ? "text-zinc-500" : "text-zinc-400",
						)}
					>
						Powered by PagePal
					</p>
				</div>
			</WidgetPanel>

			<WidgetTrigger
				closedContent={<BotIcon size={28} />}
				openContent={<XLargeIcon />}
				className={cn(
					"flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-xl transition-transform hover:scale-105 active:scale-95",
					!widget.isOpen && "animate-pulse",
				)}
			/>
		</div>
	);
}
