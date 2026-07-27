import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/bots")({
	component: BotsPage,
});

function BotsPage() {
	return (
		<div className="space-y-4">
			<h1 className="font-bold text-2xl text-foreground">Bots</h1>
			<p className="text-muted-foreground">
				Your bots list will appear here. This page is a placeholder for the bots
				management screen.
			</p>
		</div>
	);
}
