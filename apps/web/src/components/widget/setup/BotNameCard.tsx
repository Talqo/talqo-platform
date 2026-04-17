import DOMPurify from "isomorphic-dompurify"
import { Bot, Upload, X } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface BotNameCardProps {
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
	const [isDragging, setIsDragging] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const hasCustomAvatar = botAvatar && botAvatar !== "bot"

	const sanitizeSvg = useCallback((svgContent: string): string | null => {
		// Verify content starts with SVG tag (content-sniffing)
		const trimmed = svgContent.trim().toLowerCase()
		if (!trimmed.startsWith("<svg")) {
			return null
		}

		// Sanitize with DOMPurify configured for SVG
		const sanitized = DOMPurify.sanitize(svgContent, {
			USE_PROFILES: { svg: true },
			ALLOWED_TAGS: [
				"svg",
				"g",
				"path",
				"rect",
				"circle",
				"ellipse",
				"line",
				"polyline",
				"polygon",
				"text",
				"tspan",
				"defs",
				"use",
				"symbol",
				"linearGradient",
				"radialGradient",
				"stop",
				"title",
				"desc",
			],
			ALLOWED_ATTR: [
				"viewBox",
				"xmlns",
				"fill",
				"stroke",
				"stroke-width",
				"stroke-linecap",
				"stroke-linejoin",
				"d",
				"cx",
				"cy",
				"r",
				"rx",
				"ry",
				"x",
				"y",
				"x1",
				"y1",
				"x2",
				"y2",
				"points",
				"transform",
				"class",
				"id",
				"href",
				"xlink:href",
			],
		})

		// Strip width/height attributes to allow scaling
		return sanitized
			.replace(/width="[^"]*"/g, "")
			.replace(/height="[^"]*"/g, "")
	}, [])

	const readSvgFile = useCallback(
		(file: File) => {
			setError(null)

			// Validate file size
			if (file.size > MAX_AVATAR_SIZE_BYTES) {
				setError(
					`File too large. Maximum size is ${MAX_AVATAR_SIZE_BYTES / 1024}KB.`,
				)
				return
			}

			const reader = new FileReader()

			reader.onload = (event) => {
				const svgContent = event.target?.result as string
				const sanitized = sanitizeSvg(svgContent)

				if (!sanitized) {
					setError(
						"Invalid SVG file. File must start with <svg tag and contain valid SVG content.",
					)
					return
				}

				onBotAvatarChange(sanitized)
			}

			reader.onerror = () => {
				setError("Failed to read file. Please try again.")
			}

			reader.readAsText(file)
		},
		[onBotAvatarChange, sanitizeSvg],
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
			if (file && file.type === "image/svg+xml") {
				readSvgFile(file)
			}
		},
		[readSvgFile],
	)

	const handleFileSelect = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0]
			if (file && file.type === "image/svg+xml") {
				readSvgFile(file)
			}
		},
		[readSvgFile],
	)

	const handleClearAvatar = () => {
		setError(null)
		onBotAvatarChange("bot")
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
					Bot Identity
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Bot Name */}
				<div className="space-y-3">
					<Label htmlFor="bot-name" className="font-medium">
						Bot Name
					</Label>
					<Input
						id="bot-name"
						type="text"
						value={botName}
						onChange={(e) => onBotNameChange(e.target.value)}
						placeholder="AI Assistant"
						maxLength={100}
					/>
					<p className="text-muted-foreground text-xs">
						This name will be displayed in the widget header.
					</p>
				</div>

				{/* Avatar Upload */}
				<div className="space-y-3">
					<Label className="font-medium">Bot Avatar</Label>
					{error && (
						<div className="rounded-md bg-destructive/10 p-3 font-medium text-destructive text-sm">
							{error}
						</div>
					)}

					{hasCustomAvatar ? (
						<div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
							<div
								className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-primary/10"
								// biome-ignore lint/security/noDangerouslySetInnerHtml: SVG content is user-uploaded avatar
								dangerouslySetInnerHTML={{ __html: botAvatar }}
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							/>
							<div className="flex-1">
								<p className="font-medium text-sm">Custom avatar uploaded</p>
								<p className="text-muted-foreground text-xs">SVG</p>
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
							aria-label="Upload SVG avatar"
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
										Drop SVG here or click to upload
									</p>
									<p className="text-muted-foreground text-xs">
										Upload a square SVG for best results
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
