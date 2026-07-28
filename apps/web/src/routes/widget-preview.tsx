import { EmbeddedWidget, isWidgetLanguage } from "@talqo/widget";
import "@talqo/widget/style.css";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/widget-preview")({
	validateSearch: (search: Record<string, unknown>) => ({
		accent: typeof search.accent === "string" ? search.accent : undefined,
		position:
			search.position === "bottom-left"
				? ("bottom-left" as const)
				: ("bottom-right" as const),
		language: isWidgetLanguage(search.language) ? search.language : undefined,
	}),
	component: WidgetPreviewPage,
});

function WidgetPreviewPage() {
	const { accent, position, language } = Route.useSearch();

	return (
		<div
			className="relative min-h-screen bg-background p-6 text-foreground"
			style={accent ? ({ "--talqo-primary": accent } as CSSProperties) : {}}
		>
			<Button asChild variant="outline">
				<Link to="/dashboard/widget">
					<ArrowLeft className="size-4" />
					Back to widget setup
				</Link>
			</Button>
			<div
				className={`absolute bottom-6 ${
					position === "bottom-left" ? "left-6" : "right-6"
				}`}
			>
				<EmbeddedWidget title="AI Chat" language={language} />
			</div>
		</div>
	);
}
