import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/analytics")({
	component: AnalyticsPage,
});

function AnalyticsPage() {
	return (
		<div className="space-y-4">
			<h1 className="font-bold text-2xl text-foreground">Analytics</h1>
			<p className="text-muted-foreground">
				Conversation and usage analytics will appear here.
			</p>
		</div>
	);
}
