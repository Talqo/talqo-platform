import { Bot, Moon, Sun } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { WidgetColorsConfig, WidgetIcons } from "./types"

interface WidgetPreviewProps {
	colors: WidgetColorsConfig
	icons: WidgetIcons
	botName: string
	position: "left" | "right"
}

export function WidgetPreview({
	colors,
	icons,
	botName,
	position,
}: WidgetPreviewProps) {
	const hasCustomAvatar = icons.botAvatar && icons.botAvatar !== "bot"
	const [isDark, setIsDark] = useState(false)
	const themeColors = isDark ? colors.dark : colors.light

	return (
		<Card className="sticky top-6">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle>Live Preview</CardTitle>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setIsDark(!isDark)}
					className="gap-2"
				>
					{isDark ? <Sun size={16} /> : <Moon size={16} />}
					{isDark ? "Light Mode" : "Dark Mode"}
				</Button>
			</CardHeader>
			<CardContent>
				<div
					className={cn(
						"relative h-[500px] overflow-hidden rounded-lg border",
						isDark
							? "bg-gradient-to-br from-gray-800 to-gray-900"
							: "bg-gradient-to-br from-gray-100 to-gray-200",
					)}
				>
					{/* Mock website background */}
					<div className="p-8 opacity-50">
						<div
							className={cn(
								"mb-4 h-8 w-3/4 rounded",
								isDark ? "bg-gray-700" : "bg-gray-300",
							)}
						/>
						<div className="space-y-2">
							<div
								className={cn(
									"h-4 w-full rounded",
									isDark ? "bg-gray-700" : "bg-gray-300",
								)}
							/>
							<div
								className={cn(
									"h-4 w-5/6 rounded",
									isDark ? "bg-gray-700" : "bg-gray-300",
								)}
							/>
							<div
								className={cn(
									"h-4 w-4/6 rounded",
									isDark ? "bg-gray-700" : "bg-gray-300",
								)}
							/>
						</div>
					</div>

					{/* Widget Preview */}
					<div
						className={cn(
							"absolute bottom-4 flex flex-col items-end",
							position === "left" ? "left-4 items-start" : "right-4 items-end",
						)}
					>
						{/* Chat Panel */}
						<div
							className="mb-3 w-[280px] overflow-hidden rounded-xl shadow-2xl"
							style={{ backgroundColor: themeColors.bgPrimary }}
						>
							{/* Header */}
							<div
								className="flex items-center justify-between p-3"
								style={{ backgroundColor: themeColors.primary }}
							>
								<div className="flex items-center gap-2">
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white">
										{hasCustomAvatar ? (
											<div
												className="h-4 w-4"
												dangerouslySetInnerHTML={{
													__html: icons.botAvatar,
												}}
											/>
										) : (
											<Bot size={16} />
										)}
									</div>
									<span className="font-semibold text-sm text-white">
										{botName}
									</span>
								</div>
							</div>

							{/* Messages */}
							<div
								className="h-[180px] space-y-3 p-3"
								style={{ backgroundColor: themeColors.bgPrimary }}
							>
								{/* Bot message */}
								<div className="flex gap-2">
									<div
										className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-white"
										style={{ backgroundColor: themeColors.primary }}
									>
										{hasCustomAvatar ? (
											<div
												className="h-3.5 w-3.5"
												dangerouslySetInnerHTML={{
													__html: icons.botAvatar,
												}}
											/>
										) : (
											<Bot size={14} />
										)}
									</div>
									<div
										className="max-w-[80%] rounded-2xl rounded-tl-md px-3 py-2 text-sm"
										style={{
											backgroundColor: themeColors.bgSecondary,
											color: themeColors.textPrimary,
											border: `1px solid ${themeColors.border}`,
										}}
									>
										Hi! How can I help you today?
									</div>
								</div>

								{/* User message */}
								<div className="flex flex-row-reverse gap-2">
									<div
										className="max-w-[80%] rounded-2xl rounded-tr-md px-3 py-2 text-sm text-white"
										style={{ backgroundColor: themeColors.primary }}
									>
										Hello!
									</div>
								</div>
							</div>

							{/* Input */}
							<div
								className="flex gap-2 border-t p-3"
								style={{
									backgroundColor: themeColors.bgPrimary,
									borderColor: themeColors.border,
								}}
							>
								<div
									className="flex-1 rounded-full px-3 py-2 text-sm"
									style={{
										backgroundColor: themeColors.bgSecondary,
										border: `1px solid ${themeColors.border}`,
										color: themeColors.textSecondary,
									}}
								>
									Type a message...
								</div>
								<div
									className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
									style={{ backgroundColor: themeColors.primary }}
								>
									→
								</div>
							</div>

							{/* Footer */}
							<div
								className="py-2 text-center text-xs"
								style={{
									backgroundColor: themeColors.primary,
									color: "rgba(255,255,255,0.8)",
								}}
							>
								Powered by PagePal
							</div>
						</div>

						{/* Trigger Button */}
						<div
							className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
							style={{ backgroundColor: themeColors.primary }}
						>
							{hasCustomAvatar ? (
								<div
									className="h-7 w-7"
									dangerouslySetInnerHTML={{ __html: icons.botAvatar }}
								/>
							) : (
								<Bot size={28} />
							)}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
