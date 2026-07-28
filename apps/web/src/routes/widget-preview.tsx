import { EmbeddedWidget } from "@talqo/widget";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/widget-preview")({
	component: WidgetPreviewPage,
});

function WidgetPreviewPage() {
	return (
		<div className="relative min-h-screen bg-background p-6 text-foreground">
			<Button asChild variant="outline">
				<Link to="/dashboard/widget">
					<ArrowLeft className="size-4" />
					Back to widget setup
				</Link>
			</Button>
			<div className="absolute right-6 bottom-6">
				<EmbeddedWidget title="AI Chat" />
			</div>
		</div>
	);
}
