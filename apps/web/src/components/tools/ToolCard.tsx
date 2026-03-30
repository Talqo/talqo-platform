import { Button } from "@/components/ui/button";
import type { Tool } from "@/data/tools";
import { ToolIcon } from "./ToolIcon";

interface ToolCardProps {
	tool: Tool;
	isAdded: boolean;
	onAdd: (tool: Tool, event: React.MouseEvent) => void;
}

export function ToolCard({ tool, isAdded, onAdd }: ToolCardProps) {
	return (
		<div className="rounded-lg border border-border p-4 transition-colors hover:border-zinc-300 dark:hover:border-zinc-700">
			<div className="mb-2 flex items-center justify-between">
				<ToolIcon color={tool.color} icon={tool.icon} size="md" />
				<Button
					size="sm"
					onClick={(e) => {
						e.stopPropagation();
						onAdd(tool, e);
					}}
					disabled={isAdded}
				>
					{isAdded ? "Added" : "+ Add"}
				</Button>
			</div>
			<p className="font-medium">{tool.name}</p>
			<p className="text-muted-foreground text-sm">{tool.description}</p>
		</div>
	);
}
