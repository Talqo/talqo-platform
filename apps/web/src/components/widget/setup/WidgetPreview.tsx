import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { WidgetColors } from "./types"

interface WidgetPreviewProps {
	colors: WidgetColors
	position: "left" | "right"
}

export function WidgetPreview({ colors, position }: WidgetPreviewProps) {
	return (
		<Card className="sticky top-6">
			<CardHeader>
				<CardTitle>Live Preview</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="relative h-[500px] overflow-hidden rounded-lg border bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
					{/* Mock website background */}
					<div className="p-8 opacity-50">
						<div className="mb-4 h-8 w-3/4 rounded bg-gray-300 dark:bg-gray-700" />
						<div className="space-y-2">
							<div className="h-4 w-full rounded bg-gray-300 dark:bg-gray-700" />
							<div className="h-4 w-5/6 rounded bg-gray-300 dark:bg-gray-700" />
							<div className="h-4 w-4/6 rounded bg-gray-300 dark:bg-gray-700" />
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
							style={{ backgroundColor: colors.bgPrimary }}
						>
							{/* Header */}
							<div
								className="flex items-center justify-between p-3"
								style={{ backgroundColor: colors.primary }}
							>
								<div className="flex items-center gap-2">
									<div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white text-xs">
										AI
									</div>
									<span className="font-semibold text-sm text-white">
										AI Assistant
									</span>
								</div>
							</div>

							{/* Messages */}
							<div
								className="h-[180px] space-y-3 p-3"
								style={{ backgroundColor: colors.bgPrimary }}
							>
								{/* Bot message */}
								<div className="flex gap-2">
									<div
										className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-white text-xs"
										style={{ backgroundColor: colors.primary }}
									>
										AI
									</div>
									<div
										className="max-w-[80%] rounded-2xl rounded-tl-md px-3 py-2 text-sm"
										style={{
											backgroundColor: colors.bgSecondary,
											color: colors.textPrimary,
											border: `1px solid ${colors.border}`,
										}}
									>
										Hi! How can I help you today?
									</div>
								</div>

								{/* User message */}
								<div className="flex flex-row-reverse gap-2">
									<div
										className="max-w-[80%] rounded-2xl rounded-tr-md px-3 py-2 text-sm text-white"
										style={{ backgroundColor: colors.primary }}
									>
										Hello!
									</div>
								</div>
							</div>

							{/* Input */}
							<div
								className="flex gap-2 border-t p-3"
								style={{
									backgroundColor: colors.bgPrimary,
									borderColor: colors.border,
								}}
							>
								<div
									className="flex-1 rounded-full px-3 py-2 text-sm"
									style={{
										backgroundColor: colors.bgSecondary,
										border: `1px solid ${colors.border}`,
										color: colors.textSecondary,
									}}
								>
									Type a message...
								</div>
								<div
									className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
									style={{ backgroundColor: colors.primary }}
								>
									→
								</div>
							</div>

							{/* Footer */}
							<div
								className="py-2 text-center text-xs"
								style={{
									backgroundColor: colors.primary,
									color: "rgba(255,255,255,0.8)",
								}}
							>
								Powered by PagePal
							</div>
						</div>

						{/* Trigger Button */}
						<div
							className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
							style={{ backgroundColor: colors.primary }}
						>
							AI
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
