import { Check, Code, Copy, Monitor } from "lucide-react"
import { useState } from "react"
import { useCurrentUser } from "@/api/hooks"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface WidgetColors {
	primary: string
	bgPrimary: string
	bgSecondary: string
	textPrimary: string
	textSecondary: string
	border: string
}

const defaultColors: WidgetColors = {
	primary: "hsl(142 76% 36%)",
	bgPrimary: "#ffffff",
	bgSecondary: "hsl(240 5% 96%)",
	textPrimary: "hsl(240 6% 10%)",
	textSecondary: "hsl(240 4% 46%)",
	border: "hsl(240 6% 90%)",
}

export function WidgetSetup() {
	const { data: client } = useCurrentUser()
	const [colors, setColors] = useState<WidgetColors>(defaultColors)
	const [position, setPosition] = useState<"left" | "right">("right")
	const [copied, setCopied] = useState(false)

	const scriptUrl = import.meta.env.DEV
		? "http://localhost:5174/widget-bundle.js"
		: "https://dev.pagepal.dyn.cloud.e-infra.cz/widget-bundle.js"

	const embedCode = `<script>
  window.__AI_WIDGET_CONFIG__ = {
    clientId: "${client?.widgetToken || "your-client-id"}",
    position: "${position}",
    colors: {
      primary: "${colors.primary}",
      bgPrimary: "${colors.bgPrimary}",
      bgSecondary: "${colors.bgSecondary}",
      textPrimary: "${colors.textPrimary}",
      textSecondary: "${colors.textSecondary}",
      border: "${colors.border}"
    }
  };
</script>
<script async defer src="${scriptUrl}"></script>`

	const copyToClipboard = async () => {
		await navigator.clipboard.writeText(embedCode)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const updateColor = (key: keyof WidgetColors, value: string) => {
		setColors((prev) => ({ ...prev, [key]: value }))
	}

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			{/* Configuration Panel */}
			<div className="space-y-6">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Monitor size={20} />
							Appearance
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label>Widget Position</Label>
							<div className="flex gap-2">
								<Button
									type="button"
									variant={position === "left" ? "default" : "outline"}
									onClick={() => setPosition("left")}
								>
									Bottom Left
								</Button>
								<Button
									type="button"
									variant={position === "right" ? "default" : "outline"}
									onClick={() => setPosition("right")}
								>
									Bottom Right
								</Button>
							</div>
						</div>

						<div className="space-y-3">
							<Label>Brand Colors</Label>
							<div className="grid gap-3">
								<ColorPicker
									label="Primary (buttons, header)"
									value={colors.primary}
									onChange={(v) => updateColor("primary", v)}
								/>
								<ColorPicker
									label="Background Primary"
									value={colors.bgPrimary}
									onChange={(v) => updateColor("bgPrimary", v)}
								/>
								<ColorPicker
									label="Background Secondary"
									value={colors.bgSecondary}
									onChange={(v) => updateColor("bgSecondary", v)}
								/>
								<ColorPicker
									label="Text Primary"
									value={colors.textPrimary}
									onChange={(v) => updateColor("textPrimary", v)}
								/>
								<ColorPicker
									label="Text Secondary"
									value={colors.textSecondary}
									onChange={(v) => updateColor("textSecondary", v)}
								/>
								<ColorPicker
									label="Border Color"
									value={colors.border}
									onChange={(v) => updateColor("border", v)}
								/>
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Code size={20} />
							Embed Code
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="relative">
							<pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
								{embedCode}
							</pre>
							<Button
								size="sm"
								variant="secondary"
								className="absolute top-2 right-2"
								onClick={copyToClipboard}
							>
								{copied ? (
									<>
										<Check size={16} className="mr-1" />
										Copied!
									</>
								) : (
									<>
										<Copy size={16} className="mr-1" />
										Copy
									</>
								)}
							</Button>
						</div>
						<div className="text-muted-foreground text-sm">
							<p className="font-semibold">Installation Instructions:</p>
							<ol className="mt-2 list-inside list-decimal space-y-1">
								<li>Copy the code above</li>
								<li>
									Paste it before the closing &lt;/body&gt; tag on your website
								</li>
								<li>The widget will appear on your site automatically</li>
							</ol>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Preview Panel */}
			<div>
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
									position === "left"
										? "left-4 items-start"
										: "right-4 items-end",
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
												className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs text-white"
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
			</div>
		</div>
	)
}

interface ColorPickerProps {
	label: string
	value: string
	onChange: (value: string) => void
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
	return (
		<div className="flex items-center gap-3">
			<Label className="w-32 flex-shrink-0 text-sm">{label}</Label>
			<div className="flex flex-1 items-center gap-2">
				<Input
					type="color"
					value={value.startsWith("hsl") ? hslToHex(value) : value}
					onChange={(e) => onChange(e.target.value)}
					className="h-9 w-16 p-1"
				/>
				<Input
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="flex-1 font-mono text-sm"
					placeholder="#ffffff or hsl(...)"
				/>
			</div>
		</div>
	)
}

function hslToHex(hsl: string): string {
	// Simple conversion for color picker - if it's already hex, return as-is
	if (hsl.startsWith("#")) return hsl

	// Extract HSL values
	const match = hsl.match(/hsl\((\d+)\s+(\d+)%?\s+(\d+)%?\)/)
	if (!match) return "#10b981"

	const h = Number.parseInt(match[1], 10) / 360
	const s = Number.parseInt(match[2], 10) / 100
	const l = Number.parseInt(match[3], 10) / 100

	const hue2rgb = (p: number, q: number, t: number) => {
		if (t < 0) t += 1
		if (t > 1) t -= 1
		if (t < 1 / 6) return p + (q - p) * 6 * t
		if (t < 1 / 2) return q
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
		return p
	}

	const q = l < 0.5 ? l * (1 + s) : l + s - l * s
	const p = 2 * l - q

	const r = Math.round(hue2rgb(p, q, h + 1 / 3) * 255)
	const g = Math.round(hue2rgb(p, q, h) * 255)
	const b = Math.round(hue2rgb(p, q, h - 1 / 3) * 255)

	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
}
