import { useCallback, useState } from "react";
import { type ContextFile, FileList } from "@/components/bot-context";
import { PageContainer } from "@/components/layout";

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

function isTextFile(file: File): boolean {
	if (file.type.startsWith("text/")) return true;

	const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
	return TEXT_EXTENSIONS.has(ext);
}

export function BotContextPage() {
	const [files, setFiles] = useState<ContextFile[]>([]);

	const handleFileUpload = useCallback(
		async (uploadedFiles: FileList | null) => {
			if (!uploadedFiles) return [];

			const existingNames = new Set(files.map((f) => f.name.toLowerCase()));
			const newFiles: ContextFile[] = [];

			for (const file of Array.from(uploadedFiles)) {
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
