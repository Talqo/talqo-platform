import { Bot, Upload, X } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sanitizeSvg } from "@/lib/sanitize-svg"
import { DEFAULT_BOT_AVATAR } from "./constants"

type BotNameCardProps = {
	botName: string
	botAvatar: string
	onBotNameChange: (value: string) => void
	onBotAvatarChange: (value: string) => void
}

const MAX_AVATAR_SIZE_BYTES = 50 * 1024 // 50KB max SVG size

export function BotNameCard({
	botName,
	botAvatar,
	onBotNameChange,
	onBotAvatarChange,
}: BotNameCardProps) {
	const { t } = useTranslation()
	const [isDragging, setIsDragging] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const hasCustomAvatar = Boolean(botAvatar) && botAvatar !== DEFAULT_BOT_AVATAR

	const readSvgFile = useCallback(
		(file: File) => {
			setError(null)

			// Validate file size
			if (file.size > MAX_AVATAR_SIZE_BYTES) {
				setError(
					t("widget.botName.fileTooLarge", {
						maxSize: MAX_AVATAR_SIZE_BYTES / 1024,
					}),
				)
				return
			}

			const reader = new FileReader()

			reader.onload = (event) => {
				const result = event.target?.result
				// Validate result is a string before sanitizing
				if (typeof result !== "string") {
					setError(t("widget.botName.invalidFileContent"))
					return
				}
				const svgContent = result
				const sanitized = sanitizeSvg(svgContent)

				if (!sanitized) {
					setError(t("widget.botName.invalidSvgFile"))
					return
				}

				onBotAvatarChange(sanitized)
			}

			reader.onerror = () => {
				setError(t("widget.botName.failedToReadFile"))
			}

			reader.readAsText(file)
		},
		[onBotAvatarChange, t],
	)

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(true)
	}, [])

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
	}, [])

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			setIsDragging(false)

			const file = e.dataTransfer.files[0]
			if (file) {
				if (file.type !== "image/svg+xml") {
					setError(t("widget.botName.onlySvgSupported"))
					return
				}
				setError(null)
				readSvgFile(file)
			}
		},
		[readSvgFile, t],
	)

	const handleFileSelect = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0]
			if (file) {
				if (file.type !== "image/svg+xml") {
					setError(t("widget.botName.onlySvgSupported"))
					return
				}
				setError(null)
				readSvgFile(file)
			}
		},
		[readSvgFile, t],
	)

	const handleClearAvatar = () => {
		setError(null)
		onBotAvatarChange(DEFAULT_BOT_AVATAR)
		if (fileInputRef.current) {
			fileInputRef.current.value = ""
		}
	}

	const handleClickUpload = () => {
		fileInputRef.current?.click()
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Bot size={20} />
					{t("widget.botName.title")}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Bot Name */}
				<div className="space-y-3">
					<Label htmlFor="bot-name" className="font-medium">
						{t("widget.botName.botNameLabel")}
					</Label>
					<Input
						id="bot-name"
						type="text"
						value={botName}
						onChange={(e) => onBotNameChange(e.target.value)}
						placeholder={t("widget.botName.botNamePlaceholder")}
						maxLength={100}
					/>
					<p className="text-muted-foreground text-xs">
						{t("widget.botName.botNameHelp")}
					</p>
				</div>

				{/* Avatar Upload */}
				<div className="space-y-3">
					<Label className="mb-2 block font-medium">
						{t("widget.botName.botAvatarLabel")}
					</Label>
					{error && (
						<div className="rounded-md bg-destructive/10 p-3 font-medium text-destructive text-sm">
							{error}
						</div>
					)}

					{hasCustomAvatar ? (
						<div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
							<div
								className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-primary/10"
								// biome-ignore lint/security/noDangerouslySetInnerHtml: SVG is sanitized by sanitizeSvg
								dangerouslySetInnerHTML={{ __html: botAvatar }}
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							/>
							<div className="flex-1">
								<p className="font-medium text-sm">
									{t("widget.botName.customAvatarUploaded")}
								</p>
								<p className="text-muted-foreground text-xs">
									{t("widget.botName.avatarFileType")}
								</p>
							</div>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={handleClearAvatar}
							>
								<X size={16} />
							</Button>
						</div>
					) : (
						<button
							type="button"
							className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-left transition-colors ${
								isDragging
									? "border-primary bg-primary/5"
									: "border-muted-foreground/25 hover:border-muted-foreground/50"
							}`}
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
							onClick={handleClickUpload}
							aria-label={t("widget.botName.botAvatarLabel")}
						>
							<input
								ref={fileInputRef}
								type="file"
								accept=".svg,image/svg+xml"
								onChange={handleFileSelect}
								className="hidden"
							/>
							<div className="flex flex-col items-center gap-2 text-center">
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
									<Upload size={20} className="text-muted-foreground" />
								</div>
								<div>
									<p className="font-medium text-sm">
										{t("widget.botName.dropSvgHere")}
									</p>
									<p className="text-muted-foreground text-xs">
										{t("widget.botName.uploadSquareSvg")}
									</p>
								</div>
							</div>
						</button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
