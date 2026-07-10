import { Check, Code, Copy } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type EmbedCodeCardProps = {
	widgetToken: string | undefined
	isLoading: boolean
}

export function EmbedCodeCard({ widgetToken, isLoading }: EmbedCodeCardProps) {
	const { t } = useTranslation()
	const [copied, setCopied] = useState(false)
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const scriptUrl =
		import.meta.env.VITE_WIDGET_BUNDLE_URL ??
		(import.meta.env.DEV
			? "http://localhost:5174/widget-bundle.js"
			: "https://talqo.chat/widget-bundle.js")

	const placeholderCode = t("widget.embedCode.placeholder")

	let embedCode: string
	if (isLoading || !widgetToken) {
		embedCode = placeholderCode
	} else {
		const configObject = { token: widgetToken }
		// Escape script-sensitive sequences to prevent XSS and Unicode separators
		const configJson = JSON.stringify(configObject, null, 2)
			.replace(/\n/g, "\n  ")
			.replace(/</g, "\\x3c")
			.replace(/>/g, "\\x3e")
			.replace(/\u2028/g, "\\u2028") // Line separator
			.replace(/\u2029/g, "\\u2029") // Paragraph separator

		embedCode = `<script>
  window.__TALQO__ = ${configJson};
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
		if (isLoading || !widgetToken) return
		try {
			await navigator.clipboard.writeText(embedCode)
			setCopied(true)

			if (copiedTimeoutRef.current) {
				clearTimeout(copiedTimeoutRef.current)
			}
			copiedTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
		} catch (err) {
			if (import.meta.env.DEV) {
				console.error("Failed to copy to clipboard:", err)
			}
			setCopied(false)
		}
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Code size={20} />
					{t("widget.embedCode.title")}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="relative">
					<pre
						className={`overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm ${isLoading || !widgetToken ? "opacity-50 blur-[1px]" : ""}`}
					>
						{embedCode}
					</pre>
					<Button
						size="sm"
						variant="secondary"
						className="absolute top-2 right-2"
						onClick={copyToClipboard}
						disabled={isLoading || !widgetToken}
					>
						{copied ? (
							<>
								<Check size={16} className="mr-1" />
								{t("widget.embedCode.copied")}
							</>
						) : (
							<>
								<Copy size={16} className="mr-1" />
								{isLoading
									? t("widget.embedCode.loading")
									: t("widget.embedCode.copy")}
							</>
						)}
					</Button>
				</div>
				<div className="text-muted-foreground text-sm">
					<p className="font-semibold">
						{t("widget.embedCode.installInstructions")}
					</p>
					<ol className="mt-2 list-inside list-decimal space-y-1">
						<li>{t("widget.embedCode.step1")}</li>
						<li>{t("widget.embedCode.step2")}</li>
						<li>{t("widget.embedCode.step3")}</li>
					</ol>
				</div>
			</CardContent>
		</Card>
	)
}
