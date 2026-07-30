import { createRoot, type Root } from "react-dom/client";
import { EmbeddedWidget, type EmbeddedWidgetProps } from "./EmbeddedWidget";
import { isWidgetLanguage } from "./lib/i18n";

let root: Root | null = null;

export type MountTarget = string | HTMLElement;

// Reads the embed snippet's configuration, e.g.
// <script src=".../v1.js" data-talqo-bot="..." data-talqo-language="cs" defer>.
function currentScriptProps(): EmbeddedWidgetProps {
	const dataset = document.currentScript?.dataset;
	if (!dataset) {
		return {};
	}
	const { talqoBot, talqoLanguage, talqoTitle } = dataset;
	return {
		botId: talqoBot,
		language: isWidgetLanguage(talqoLanguage) ? talqoLanguage : undefined,
		title: talqoTitle,
	};
}

export function mount(target: MountTarget = "#talqo-widget") {
	unmount();

	const element =
		typeof target === "string" ? document.querySelector(target) : target;
	if (!(element instanceof HTMLElement)) {
		console.warn(
			`TalqoWidget: mount target not found (${typeof target === "string" ? target : "element"})`,
		);
		return;
	}

	root = createRoot(element);
	root.render(<EmbeddedWidget {...currentScriptProps()} />);
}

export function unmount() {
	if (root) {
		root.unmount();
		root = null;
	}
}

declare global {
	interface Window {
		TalqoWidget?: {
			mount: typeof mount;
			unmount: typeof unmount;
		};
	}
}

window.TalqoWidget = { mount, unmount };

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", () => mount());
} else {
	mount();
}
