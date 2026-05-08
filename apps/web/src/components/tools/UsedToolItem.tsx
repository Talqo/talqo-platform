import { motion } from "motion/react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import type { Tool } from "@/data/tools"
import { getToolDescription } from "@/data/tools"
import { ToolIcon } from "./ToolIcon"

type UsedToolItemProps = {
	tool: Tool
}

export function UsedToolItem({ tool }: UsedToolItemProps) {
	const { t } = useTranslation()
	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: -10 }}
			className="flex items-center justify-between border-border border-b p-4 last:border-b-0"
		>
			<div className="flex items-center gap-3">
				<ToolIcon color={tool.color} icon={tool.icon} size="sm" />
				<div>
					<p className="font-medium">{tool.name}</p>
					<p className="text-muted-foreground text-sm">
						{getToolDescription(tool.name, t)}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Button
					size="sm"
					variant="outline"
					disabled
					title={t("tools.usedToolItem.configurationComingSoon")}
				>
					{t("tools.usedToolItem.configure")}
				</Button>
			</div>
		</motion.div>
	)
}
