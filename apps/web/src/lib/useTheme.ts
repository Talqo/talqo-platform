import { useEffect, useState } from "react";
import { DEFAULTS, STORAGE_KEYS } from "@/lib/constants";

export type Theme = "light" | "dark";

export function useTheme() {
	const [theme, setTheme] = useState<Theme>(() => {
		if (typeof window === "undefined") return DEFAULTS.THEME;
		const stored = localStorage.getItem(STORAGE_KEYS.THEME);
		return stored === "light" || stored === "dark" ? stored : DEFAULTS.THEME;
	});

	useEffect(() => {
		const root = window.document.documentElement;
		if (theme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
		localStorage.setItem(STORAGE_KEYS.THEME, theme);
	}, [theme]);

	// Listen for toggle events from other components (e.g., chat widget)
	useEffect(() => {
		const handleToggle = () => {
			setTheme((prev) => (prev === "light" ? "dark" : "light"));
		};

		document.addEventListener("toggle-theme", handleToggle);
		return () => {
			document.removeEventListener("toggle-theme", handleToggle);
		};
	}, []);

	const toggleTheme = () => {
		setTheme((prev) => (prev === "light" ? "dark" : "light"));
	};

	return { theme, toggleTheme };
}
