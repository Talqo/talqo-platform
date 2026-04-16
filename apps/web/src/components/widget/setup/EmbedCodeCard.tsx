import { Check, Code, Copy } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { WidgetColors } from "./types"

interface EmbedCodeCardProps {
	clientId: string | undefined
	position: "left" | "right"
	colors: WidgetColors
	isLoading: boolean
}

export function EmbedCodeCard({
	clientId,
	position,
	colors,
	isLoading,
}: EmbedCodeCardProps) {
	const [copied, setCopied] = useState(false)

	const scriptUrl = import.meta.env.DEV
		? "http://localhost:5174/widget-bundle.js"
		: "https://dev.pagepal.dyn.cloud.e-infra.cz/widget-bundle.js"

	const actualClientId = clientId || "your-client-id"

	const embedCode = `<script>
  window.__AI_WIDGET_CONFIG__ = {
    clientId: "${actualClientId}",
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
		if (isLoading || !clientId) return
		try {
			await navigator.clipboard.writeText(embedCode)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
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
					<pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
						{embedCode}
					</pre>
					<Button
						size="sm"
						variant="secondary"
						className="absolute top-2 right-2"
						onClick={copyToClipboard}
						disabled={isLoading || !clientId}
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
