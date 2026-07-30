import { useCallback, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "talqo-theme";

// Read the theme to use on first paint: stored preference wins, otherwise the
// OS preference. Called both by main.tsx before render (avoids a flash of the
// wrong theme) and by useTheme's initializer, so it must be SSR-safe.
export function getInitialTheme(): Theme {
	if (typeof window === "undefined") {
		return "light";
	}
	const stored = window.localStorage.getItem(STORAGE_KEY);
	if (stored === "light" || stored === "dark") {
		return stored;
	}
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

export function applyTheme(theme: Theme) {
	document.documentElement.classList.toggle("dark", theme === "dark");
	window.localStorage.setItem(STORAGE_KEY, theme);
}

export function useTheme() {
	const [theme, setTheme] = useState<Theme>(getInitialTheme);

	const toggleTheme = useCallback(() => {
		setTheme((prev) => {
			const next = prev === "dark" ? "light" : "dark";
			applyTheme(next);
			return next;
		});
	}, []);

	return { theme, toggleTheme };
}
