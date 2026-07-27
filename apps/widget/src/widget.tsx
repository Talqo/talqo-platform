import { createRoot, type Root } from "react-dom/client";
import { EmbeddedWidget } from "./EmbeddedWidget";

let root: Root | null = null;

export type MountTarget = string | HTMLElement;

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
	root.render(<EmbeddedWidget />);
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
