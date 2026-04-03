import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { type ContextFile, FileList } from "@/components/bot-context";
import { PageContainer } from "@/components/layout";

export const Route = createFileRoute("/dashboard/bot-context")({
	component: BotContextPage,
});

function generateId(): string {
	return Math.random().toString(36).substring(2, 9);
}

function readFileContent(file: File): Promise<string> {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = (event: ProgressEvent<FileReader>) => {
			const result = event.target?.result;
			const content = typeof result === "string" ? result : "";
			resolve(content);
		};
		reader.readAsText(file);
	});
}

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

function isTextFile(file: File): boolean {
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
	return true;
}

function BotContextPage() {
	const [files, setFiles] = useState<ContextFile[]>([]);

	const handleFileUpload = useCallback(
		async (uploadedFiles: File[]) => {
			if (!uploadedFiles.length) return [];

			const existingNames = new Set(files.map((f) => f.name.toLowerCase()));
			const newFiles: ContextFile[] = [];

			for (const file of uploadedFiles) {
				if (!isTextFile(file)) {
					continue;
				}

				if (existingNames.has(file.name.toLowerCase())) {
					continue;
				}

				const content = await readFileContent(file);
				const now = new Date();
				newFiles.push({
					id: generateId(),
					name: file.name,
					content,
					size: file.size,
					createdAt: now,
					updatedAt: now,
				});
				existingNames.add(file.name.toLowerCase());
			}

			if (newFiles.length > 0) {
				setFiles((prev) => [...prev, ...newFiles]);
			}

			return newFiles;
		},
		[files],
	);

	const handleDelete = useCallback((id: string) => {
		setFiles((prev) => prev.filter((f) => f.id !== id));
	}, []);

	const handleRename = useCallback(
		(
			id: string,
			newName: string,
		): { success: boolean; error?: "duplicate" } => {
			const trimmedName = newName.trim();
			if (!trimmedName) {
				return { success: false };
			}

			const targetFile = files.find((f) => f.id === id);
			if (!targetFile) {
				return { success: false };
			}

			const isDuplicate = files.some(
				(f) =>
					f.id !== id && f.name.toLowerCase() === trimmedName.toLowerCase(),
			);
			if (isDuplicate) {
				return { success: false, error: "duplicate" };
			}

			const lastDot = targetFile.name.lastIndexOf(".");
			const ext = lastDot > 0 ? targetFile.name.slice(lastDot) : "";
			const newNameWithExt = trimmedName.endsWith(ext)
				? trimmedName
				: trimmedName + ext;

			setFiles((prev) =>
				prev.map((f) =>
					f.id === id
						? { ...f, name: newNameWithExt, updatedAt: new Date() }
						: f,
				),
			);
			return { success: true };
		},
		[files],
	);

	return (
		<PageContainer>
			<div>
				<h1 className="font-bold text-2xl text-foreground tracking-tight">
					Bot Context
				</h1>
				<p className="text-muted-foreground">
					Upload and manage text files that provide context for your AI
					assistant.
				</p>
			</div>

			<FileList
				files={files}
				onRename={handleRename}
				onDelete={handleDelete}
				onFilesUploaded={handleFileUpload}
			/>
		</PageContainer>
	);
}
