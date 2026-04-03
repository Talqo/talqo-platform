import { useCallback } from "react";

const TEXT_EXTENSIONS = new Set([
	".txt",
	".md",
	".json",
	".js",
	".ts",
	".tsx",
	".jsx",
	".css",
	".html",
	".htm",
	".xml",
	".yaml",
	".yml",
	".csv",
	".log",
	".ini",
	".conf",
	".sh",
	".bash",
	".zsh",
	".py",
	".rb",
	".go",
	".rs",
	".java",
	".c",
	".cpp",
	".h",
	".swift",
	".kt",
]);

export function useFileValidation() {
	const isTextFile = useCallback((file: File): boolean => {
		if (file.type.startsWith("text/")) return true;

		const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
		return TEXT_EXTENSIONS.has(ext);
	}, []);

	const getFileExtension = useCallback((filename: string): string => {
		const lastDot = filename.lastIndexOf(".");
		return lastDot > 0 ? filename.slice(lastDot) : "";
	}, []);

	return { isTextFile, getFileExtension };
}
