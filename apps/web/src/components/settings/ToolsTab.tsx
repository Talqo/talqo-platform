import { AnimatePresence } from "motion/react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { ToolAnimation, ToolCard, UsedToolItem } from "@/components/tools"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	generateToolId,
	getDefaultUsedTools,
	getPreconfiguredTools,
	type Tool,
} from "@/data/tools"
import { useAnimationTimeout } from "@/hooks"

export function ToolsTab() {
	const { t } = useTranslation()
	const [movingTool, setMovingTool] = useState<{
		id: string
		icon: string
		startX: number
		startY: number
	} | null>(null)
	const [usedTools, setUsedTools] = useState<Tool[]>(getDefaultUsedTools(t))
	const [pendingToolKeys, setPendingToolKeys] = useState<Set<string>>(new Set())

	const preconfiguredTools = useMemo(() => getPreconfiguredTools(t), [t])

	const { setAnimationTimeout, clearAnimationTimeout } = useAnimationTimeout()

	const isToolAdded = useCallback(
		(toolKey: string) =>
			usedTools.some((tool) => tool.key === toolKey) ||
			pendingToolKeys.has(toolKey),
		[usedTools, pendingToolKeys],
	)

	const handleAddTool = useCallback(
		(tool: Tool, event: React.MouseEvent) => {
			if (isToolAdded(tool.key)) {
				return
			}

			// Track pending addition to prevent duplicates during animation
			setPendingToolKeys((prev) => new Set(prev).add(tool.key))

			clearAnimationTimeout()

			const rect = event.currentTarget.getBoundingClientRect()
			const startX = rect.left + rect.width / 2
			const startY = rect.top + rect.height / 2

			setMovingTool({
				id: tool.id,
				icon: tool.icon,
				startX,
				startY,
			})

			setAnimationTimeout(() => {
				setUsedTools((prev) => [...prev, { ...tool, id: generateToolId() }])
				setMovingTool(null)
				setPendingToolKeys((prev) => {
					const next = new Set(prev)
					next.delete(tool.key)
					return next
				})
			}, 1000)
		},
		[clearAnimationTimeout, setAnimationTimeout, isToolAdded],
	)

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("tools.toolsTab.title")}</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<div>
					<h3 className="mb-3 font-medium text-sm">
						{t("tools.toolsTab.currentlyUsed")}
					</h3>
					<div className="overflow-hidden rounded-lg border border-border">
						<AnimatePresence>
							{usedTools.map((tool) => (
								<UsedToolItem key={tool.id} tool={tool} />
							))}
						</AnimatePresence>
					</div>
				</div>

				<div>
					<h3 className="mb-3 font-medium text-sm">
						{t("tools.toolsTab.preconfigured")}
					</h3>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						{preconfiguredTools.map((tool) => (
							<ToolCard
								key={tool.id}
								tool={tool}
								isAdded={isToolAdded(tool.key)}
								onAdd={handleAddTool}
							/>
						))}
					</div>
				</div>

				<div className="pt-2">
					<Button variant="outline" className="w-full" asChild>
						<a
							href="https://modelcontextprotocol.io/servers"
							target="_blank"
							rel="noopener noreferrer"
						>
							{t("tools.toolsTab.seeMoreMcp")}
						</a>
					</Button>
					<p className="mt-2 text-center text-muted-foreground text-sm">
						{t("tools.toolsTab.browseDirectory")}
					</p>
				</div>

				<AnimatePresence>
					{movingTool && (
						<ToolAnimation
							icon={movingTool.icon}
							startX={movingTool.startX}
							startY={movingTool.startY}
							onComplete={() => setMovingTool(null)}
						/>
					)}
				</AnimatePresence>
			</CardContent>
			<CardFooter className="flex justify-end">
				<Button
					disabled
					title={t("tools.toolsTab.persistenceComingSoon")}
					variant="default"
				>
					{t("tools.toolsTab.saveToolConfiguration")}
				</Button>
			</CardFooter>
		</Card>
	)
}
