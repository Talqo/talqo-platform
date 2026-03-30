import { AnimatePresence } from "motion/react";
import { useCallback, useState } from "react";
import { ToolAnimation, ToolCard, UsedToolItem } from "@/components/tools";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DEFAULT_USED_TOOLS,
	generateToolId,
	PRECONFIGURED_TOOLS,
	type Tool,
} from "@/data/tools";
import { useAnimationTimeout } from "@/hooks";

export function ToolsTab() {
	const [movingTool, setMovingTool] = useState<{
		id: string;
		icon: string;
		startX: number;
		startY: number;
	} | null>(null);
	const [usedTools, setUsedTools] = useState<Tool[]>(DEFAULT_USED_TOOLS);
	const [pendingToolNames, setPendingToolNames] = useState<Set<string>>(
		new Set(),
	);

	const { setAnimationTimeout, clearAnimationTimeout } = useAnimationTimeout();

	const isToolAdded = useCallback(
		(toolName: string) =>
			usedTools.some((t) => t.name === toolName) ||
			pendingToolNames.has(toolName),
		[usedTools, pendingToolNames],
	);

	const handleAddTool = useCallback(
		(tool: Tool, event: React.MouseEvent) => {
			if (isToolAdded(tool.name)) {
				return;
			}

			// Track pending addition to prevent duplicates during animation
			setPendingToolNames((prev) => new Set(prev).add(tool.name));

			clearAnimationTimeout();

			const rect = event.currentTarget.getBoundingClientRect();
			const startX = rect.left + rect.width / 2;
			const startY = rect.top + rect.height / 2;

			setMovingTool({
				id: tool.id,
				icon: tool.icon,
				startX,
				startY,
			});

			setAnimationTimeout(() => {
				setUsedTools((prev) => [...prev, { ...tool, id: generateToolId() }]);
				setMovingTool(null);
				setPendingToolNames((prev) => {
					const next = new Set(prev);
					next.delete(tool.name);
					return next;
				});
			}, 1000);
		},
		[clearAnimationTimeout, setAnimationTimeout, isToolAdded],
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Tools (MCP)</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6">
				<div>
					<h3 className="mb-3 font-medium text-sm">Currently Used Tools</h3>
					<div className="overflow-hidden rounded-lg border border-border">
						<AnimatePresence>
							{usedTools.map((tool) => (
								<UsedToolItem key={tool.id} tool={tool} />
							))}
						</AnimatePresence>
					</div>
				</div>

				<div>
					<h3 className="mb-3 font-medium text-sm">Pre-configured Tools</h3>
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
							See More MCP Servers →
						</a>
					</Button>
					<p className="mt-2 text-center text-muted-foreground text-sm">
						Browse the official MCP server directory
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
					title="Tool configuration persistence coming soon"
					variant="default"
				>
					Save Tool Configuration
				</Button>
			</CardFooter>
		</Card>
	);
}
