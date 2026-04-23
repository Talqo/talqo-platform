import { Check, Code, Copy } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { WidgetColorsConfig, WidgetIcons } from "./types"

interface EmbedCodeCardProps {
	clientId: string | undefined
	widgetToken: string | undefined
	position: "left" | "right"
	colors: WidgetColorsConfig
	icons: WidgetIcons
	botName: string
	isLoading: boolean
}

export function EmbedCodeCard({
	clientId,
	widgetToken,
	position,
	colors,
	icons,
	botName,
	isLoading,
}: EmbedCodeCardProps) {
	const [copied, setCopied] = useState(false)
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const scriptUrl =
		import.meta.env.VITE_WIDGET_BUNDLE_URL ??
		(import.meta.env.DEV
			? "http://localhost:5174/widget-bundle.js"
			: "https://dev.pagepal.dyn.cloud.e-infra.cz/widget-bundle.js")

	const configObject = {
		clientId,
		widgetToken,
		position,
		botName,
		colors: colors.light,
		darkColors: colors.dark,
		icons,
	}

	const placeholderCode = `// Loading your widget configuration...
// Please wait while we fetch your client ID.`

	// Build embed code only when both identifiers are available
	let embedCode: string
	if (isLoading || !clientId || !widgetToken) {
		embedCode = placeholderCode
	} else {
		// Escape script-sensitive sequences to prevent XSS and Unicode separators
		const configJson = JSON.stringify(configObject, null, 2)
			.replace(/</g, "\\x3c")
			.replace(/>/g, "\\x3e")
			.replace(/\u2028/g, "\\u2028") // Line separator
			.replace(/\u2029/g, "\\u2029") // Paragraph separator

		embedCode = `<script>
  window.__AI_WIDGET_CONFIG__ = ${configJson};
</script>
<script async defer src="${scriptUrl}"></script>`
	}

	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) {
				clearTimeout(copiedTimeoutRef.current)
			}
		}
	}, [])

	const copyToClipboard = async () => {
		if (isLoading || !clientId || !widgetToken) return
		try {
			await navigator.clipboard.writeText(embedCode)
			setCopied(true)

			if (copiedTimeoutRef.current) {
				clearTimeout(copiedTimeoutRef.current)
			}
			copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
		} catch (err) {
			console.error("Failed to copy to clipboard:", err)
			setCopied(false)
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Code size={20} />
					Embed Code
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="relative">
					<pre
						className={`overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm ${isLoading || !clientId || !widgetToken ? "opacity-50 blur-[1px]" : ""}`}
					>
						{embedCode}
					</pre>
					<Button
						size="sm"
						variant="secondary"
						className="absolute top-2 right-2"
						onClick={copyToClipboard}
						disabled={isLoading || !clientId || !widgetToken}
					>
						{copied ? (
							<>
								<Check size={16} className="mr-1" />
								Copied!
							</>
						) : (
							<>
								<Copy size={16} className="mr-1" />
								{isLoading ? "Loading..." : "Copy"}
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
	)
}
