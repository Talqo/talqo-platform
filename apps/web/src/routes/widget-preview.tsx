import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/widget-preview")({
	component: WidgetPreviewPage,
});

function WidgetPreviewPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6 text-center text-foreground">
			<h1 className="font-bold text-3xl">Widget preview</h1>
			<p className="max-w-md text-muted-foreground">
				This is a placeholder for the full-screen widget preview. The live
				preview will be wired up in a later step.
			</p>
			<Button asChild variant="outline">
				<Link to="/dashboard/widget">Back to widget setup</Link>
			</Button>
		</div>
	);
}
