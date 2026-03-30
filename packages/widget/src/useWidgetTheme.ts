import { useEffect, useState } from "react";

export type WidgetTheme = "light" | "dark";

interface UseWidgetThemeReturn {
	theme: WidgetTheme;
	isDark: boolean;
}

/**
 * Hook to detect and sync with parent document theme
 * Watches for dark class on document - read-only, no manual toggle
 */
export function useWidgetTheme(): UseWidgetThemeReturn {
	const [theme, setTheme] = useState<WidgetTheme>(() => {
		if (typeof document === "undefined") return "light";
		const root = document.documentElement;
		const isDark = root.classList.contains("dark");
		return isDark ? "dark" : "light";
	});

	useEffect(() => {
		const detectTheme = () => {
			const root = document.documentElement;
			const isDark = root.classList.contains("dark");
			setTheme(isDark ? "dark" : "light");
		};

		detectTheme();

		const observer = new MutationObserver(detectTheme);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		return () => {
			observer.disconnect();
		};
	}, []);

	return {
		theme,
		isDark: theme === "dark",
	};
}
