import { createFileRoute } from "@tanstack/react-router"
import { AnimatePresence } from "motion/react"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { PageContainer } from "@/components/layout"
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
	DEFAULT_USED_TOOLS,
	generateToolId,
	PRECONFIGURED_TOOLS,
	type Tool,
} from "@/data/tools"
import { useAnimationTimeout } from "@/hooks"

export const Route = createFileRoute("/_authenticated/dashboard/tools")({
	component: ToolsPage,
})

function ToolsPage() {
	const { t } = useTranslation()
	const [movingTool, setMovingTool] = useState<{
		id: string
		icon: string
		startX: number
		startY: number
	} | null>(null)
	const [usedTools, setUsedTools] = useState<Tool[]>(DEFAULT_USED_TOOLS)
	const [pendingToolNames, setPendingToolNames] = useState<Set<string>>(
		new Set(),
	)

	const { setAnimationTimeout, clearAnimationTimeout } = useAnimationTimeout()

	const isToolAdded = useCallback(
		(toolName: string) =>
			usedTools.some((tool) => tool.name === toolName) ||
			pendingToolNames.has(toolName),
		[usedTools, pendingToolNames],
	)

	const handleAddTool = useCallback(
		(tool: Tool, event: React.MouseEvent) => {
			if (isToolAdded(tool.name)) {
				return
			}

			// Track pending addition to prevent duplicates during animation
			setPendingToolNames((prev) => new Set(prev).add(tool.name))

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
				setPendingToolNames((prev) => {
					const next = new Set(prev)
					next.delete(tool.name)
					return next
				})
			}, 1000)
		},
		[clearAnimationTimeout, setAnimationTimeout, isToolAdded],
	)

	return (
		<PageContainer>
			<div>
				<h1 className="font-bold text-2xl text-foreground tracking-tight">
					{t("dashboard.tools.title")}
				</h1>
				<p className="text-muted-foreground">
					Manage MCP (Model Context Protocol) tools and integrations for your
					bot.
				</p>
			</div>

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
							{PRECONFIGURED_TOOLS.map((tool) => (
								<ToolCard
									key={tool.id}
									tool={tool}
									isAdded={isToolAdded(tool.name)}
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
		</PageContainer>
	)
}
