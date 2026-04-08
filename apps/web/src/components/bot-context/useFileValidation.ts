import { useCallback } from "react";

// Common text file extensions that browsers might not identify correctly
const COMMON_TEXT_EXTENSIONS = new Set([
	".js",
	".ts",
	".jsx",
	".tsx",
	".py",
	".rb",
	".go",
	".rs",
	".java",
	".c",
	".cpp",
	".h",
	".hpp",
	".swift",
	".kt",
	".kts",
	".scala",
	".groovy",
	".sh",
	".bash",
	".zsh",
	".fish",
	".ps1",
	".yaml",
	".yml",
	".toml",
	".ini",
	".conf",
	".cfg",
	".env",
	".json",
	".xml",
	".csv",
	".tsv",
	".sql",
	".prisma",
	".graphql",
	".gql",
	".vue",
	".svelte",
	".astro",
	".md",
	".markdown",
	".mdx",
	".css",
	".scss",
	".sass",
	".less",
	".php",
	".pl",
	".pm",
	".lua",
	".r",
	".rmd",
	".clj",
	".cljs",
	".edn",
	".erl",
	".hrl",
	".ex",
	".exs",
	".fs",
	".fsx",
	".ml",
	".mli",
]);

// Binary file extensions to reject (common non-text files)
const BINARY_EXTENSIONS = new Set([
	".exe",
	".dll",
	".so",
	".dylib",
	".zip",
	".tar",
	".gz",
	".bz2",
	".7z",
	".rar",
	".png",
	".jpg",
	".jpeg",
	".gif",
	".bmp",
	".webp",
	".svgz",
	".mp3",
	".mp4",
	".wav",
	".ogg",
	".webm",
	".avi",
	".mov",
	".pdf",
	".doc",
	".docx",
	".xls",
	".xlsx",
	".ppt",
	".pptx",
	".ttf",
	".otf",
	".woff",
	".woff2",
	".eot",
	".ico",
	".icns",
]);

function getExtension(filename: string): string {
	const lastDot = filename.lastIndexOf(".");
	return lastDot > 0 ? filename.slice(lastDot).toLowerCase() : "";
}

export function useFileValidation() {
	const isTextFile = useCallback((file: File): boolean => {
		// Trust browser MIME type detection for text files
		if (file.type.startsWith("text/")) return true;

		// Allow specific code/markup types
		if (file.type.includes("json")) return true;
		if (file.type.includes("javascript")) return true;
		if (file.type.includes("typescript")) return true;
		if (file.type.includes("xml")) return true;
		if (file.type === "application/graphql") return true;

		const ext = getExtension(file.name);

		// Reject known binary extensions
		if (BINARY_EXTENSIONS.has(ext)) return false;
		if (ext === "") return false; // Files without extension

		// Accept common text/code extensions
		if (COMMON_TEXT_EXTENSIONS.has(ext)) return true;

		// Accept unknown extensions (let FileReader try)
		// Most legitimate text files will be caught above
		return true;
	}, []);

	const getFileExtension = useCallback((filename: string): string => {
		return getExtension(filename);
	}, []);

	return { isTextFile, getFileExtension };
}
