import { createFileRoute } from "@tanstack/react-router";
import { ToolsPage } from "@/pages";

export const Route = createFileRoute("/dashboard/tools")({
	component: ToolsPage,
});
