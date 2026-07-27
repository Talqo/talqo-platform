import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/widget")({
	component: WidgetPage,
});

function WidgetPage() {
	return (
		<div className="space-y-4">
			<h1 className="font-bold text-2xl text-foreground">Widget setup</h1>
			<p className="text-muted-foreground">
				Configure your embeddable widget here. A live preview is available
				below.
			</p>
			<Button asChild variant="outline">
				<Link to="/widget-preview">Open full-screen preview</Link>
			</Button>
		</div>
	);
}
