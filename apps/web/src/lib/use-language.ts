import { isWidgetLanguage, type WidgetLanguage } from "@talqo/widget";
import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "talqo-language";

export function getStoredLanguage(): WidgetLanguage {
	if (typeof window === "undefined") {
		return "en";
	}
	const stored = window.localStorage.getItem(STORAGE_KEY);
	return isWidgetLanguage(stored) ? stored : "en";
}

// Module-level store so every consumer stays in sync within the tab;
// localStorage only seeds the initial value.
let current: WidgetLanguage = getStoredLanguage();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

// i18n.ts hooks in here to keep the dashboard UI language in sync without a
// circular import (the dependency is one-way: i18n -> use-language).
export const subscribeLanguage = subscribe;

export function useLanguage() {
	const language = useSyncExternalStore(subscribe, () => current);

	const setLanguage = useCallback((next: WidgetLanguage) => {
		current = next;
		window.localStorage.setItem(STORAGE_KEY, next);
		for (const listener of listeners) {
			listener();
		}
	}, []);

	return { language, setLanguage };
}
