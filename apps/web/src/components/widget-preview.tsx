import { EmbeddedWidget, type WidgetLanguage } from "@talqo/widget";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type WidgetPosition = "bottom-right" | "bottom-left";

const insetClasses: Record<"card" | "page", Record<WidgetPosition, string>> = {
	card: {
		"bottom-right": "bottom-4 right-4",
		"bottom-left": "bottom-4 left-4",
	},
	page: {
		"bottom-right": "bottom-6 right-6",
		"bottom-left": "bottom-6 left-6",
	},
};

type WidgetPreviewProps = {
	accent?: string;
	position?: WidgetPosition;
	language?: WidgetLanguage;
	title?: string;
	inset?: keyof typeof insetClasses;
};

export function WidgetPreview({
	accent,
	position = "bottom-right",
	language,
	title = "AI Chat",
	inset = "card",
}: WidgetPreviewProps) {
	return (
		<div
			className={cn("absolute", insetClasses[inset][position])}
			style={accent ? ({ "--talqo-primary": accent } as CSSProperties) : {}}
		>
			<EmbeddedWidget title={title} language={language} />
		</div>
	);
}
