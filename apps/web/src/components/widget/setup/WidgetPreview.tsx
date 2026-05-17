import { Bot, Moon, Sun } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { DEFAULT_BOT_AVATAR } from "./constants"
import type { WidgetColorsConfig, WidgetIcons } from "./types"

type WidgetPreviewProps = {
	colors: WidgetColorsConfig
	icons: WidgetIcons
	botName: string
	position: "left" | "right"
}

type PreviewAvatarProps = {
	botAvatar: string
	size: number
	className?: string
}

// Extracted avatar component to reduce duplication across header, messages, and trigger
function PreviewAvatar({ botAvatar, size, className }: PreviewAvatarProps) {
	const hasCustomAvatar = Boolean(botAvatar) && botAvatar !== DEFAULT_BOT_AVATAR

	if (hasCustomAvatar) {
		return (
			<div
				className={className}
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Trusted SVG
				dangerouslySetInnerHTML={{ __html: botAvatar }}
			/>
		)
	}

	return <Bot size={size} />
}

export function WidgetPreview({
	colors,
	icons,
	botName,
	position,
}: WidgetPreviewProps) {
	const { t } = useTranslation()
	const [isDark, setIsDark] = useState(false)
	const themeColors = isDark ? colors.dark : colors.light

	return (
		<Card data-testid="live-preview-card">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle data-testid="live-preview-heading">
					{t("widget.preview.title")}
				</CardTitle>
				<Button
					variant="outline"
					size="sm"
					onClick={() => setIsDark(!isDark)}
					className="gap-2"
				>
					{isDark ? <Sun size={16} /> : <Moon size={16} />}
					{isDark
						? t("widget.preview.lightMode")
						: t("widget.preview.darkMode")}
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
										<PreviewAvatar
											botAvatar={icons.botAvatar}
											size={16}
											className="h-4 w-4"
										/>
									</div>
									<span
										className="font-semibold text-sm"
										style={{ color: themeColors.headerTitleText }}
									>
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
										<PreviewAvatar
											botAvatar={icons.botAvatar}
											size={14}
											className="h-3.5 w-3.5"
										/>
									</div>
									<div
										className="max-w-[80%] rounded-2xl rounded-tl-md px-3 py-2 text-sm"
										style={{
											backgroundColor: themeColors.bgSecondary,
											color: themeColors.textPrimary,
											border: `1px solid ${themeColors.border}`,
										}}
									>
										{t("widget.preview.botMessage")}
									</div>
								</div>

								{/* User message */}
								<div className="flex flex-row-reverse gap-2">
									<div
										className="max-w-[80%] rounded-2xl rounded-tr-md px-3 py-2 text-sm"
										style={{
											backgroundColor: themeColors.primary,
											color: themeColors.userMessageText,
										}}
									>
										{t("widget.preview.userMessage")}
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
									{t("widget.preview.typeAMessage")}
								</div>
								<div
									className="flex h-9 w-9 items-center justify-center rounded-lg"
									style={{
										backgroundColor: themeColors.primary,
										color: themeColors.sendButtonIcon,
									}}
								>
									→
								</div>
							</div>

							{/* Footer */}
							<div
								className="py-2 text-center text-xs"
								style={{
									backgroundColor: themeColors.primary,
									color: themeColors.footerText,
								}}
							>
								{t("widget.preview.poweredBy")}
							</div>
						</div>

						{/* Trigger Button */}
						<div
							className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
							style={{ backgroundColor: themeColors.primary }}
						>
							<PreviewAvatar
								botAvatar={icons.botAvatar}
								size={28}
								className="h-7 w-7"
							/>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
