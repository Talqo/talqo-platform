import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import type { Tool } from "@/data/tools"
import { ToolIcon } from "./ToolIcon"

type ToolCardProps = {
	tool: Tool
	isAdded: boolean
	onAdd: (tool: Tool, event: React.MouseEvent) => void
}

export function ToolCard({ tool, isAdded, onAdd }: ToolCardProps) {
	const { t } = useTranslation()
	return (
		<div className="rounded-lg border border-border p-4 transition-colors hover:border-muted-foreground/50">
			<div className="mb-2 flex items-center justify-between">
				<ToolIcon color={tool.color} icon={tool.icon} size="md" />
				<Button
					size="sm"
					onClick={(e) => {
						e.stopPropagation()
						onAdd(tool, e)
					}}
					disabled={isAdded}
				>
					{isAdded ? t("tools.toolCard.added") : t("tools.toolCard.addTool")}
				</Button>
			</div>
			<p className="font-medium">{tool.name}</p>
			<p className="text-muted-foreground text-sm">{tool.description}</p>
		</div>
	)
}
