import { useCallback, useState } from "react";
import {
	type ContextFile,
	EditFileDialog,
	FileList,
	FileUploadZone,
} from "@/components/bot-context";
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

export function BotContextPage() {
	const [files, setFiles] = useState<ContextFile[]>([]);

	// Dialog state
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingFileId, setEditingFileId] = useState<string | null>(null);
	const [editContent, setEditContent] = useState("");

	const handleFileUpload = useCallback(
		async (uploadedFiles: FileList | null) => {
			if (!uploadedFiles) return;

			for (const file of Array.from(uploadedFiles)) {
				if (file.type !== "text/plain" && !file.name.endsWith(".txt")) {
					continue;
				}

				const content = await readFileContent(file);
				const now = new Date();
				const newFile: ContextFile = {
					id: generateId(),
					name: file.name,
					content,
					createdAt: now,
					updatedAt: now,
				};
				setFiles((prev) => [...prev, newFile]);
			}
		},
		[],
	);

	const handleDelete = useCallback((id: string) => {
		setFiles((prev) => prev.filter((f) => f.id !== id));
	}, []);

	const openEditDialog = useCallback((file: ContextFile) => {
		setEditingFileId(file.id);
		setEditContent(file.content);
		setIsDialogOpen(true);
	}, []);

	const closeDialog = useCallback(() => {
		setIsDialogOpen(false);
		setEditingFileId(null);
		setEditContent("");
	}, []);

	const saveEditing = useCallback(() => {
		if (!editingFileId) return;

		setFiles((prev) =>
			prev.map((f) =>
				f.id === editingFileId
					? { ...f, content: editContent, updatedAt: new Date() }
					: f,
			),
		);
		closeDialog();
	}, [editingFileId, editContent, closeDialog]);

	const editingFile = files.find((f) => f.id === editingFileId) ?? null;

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

			<FileUploadZone onFilesUploaded={handleFileUpload} />

			<FileList files={files} onEdit={openEditDialog} onDelete={handleDelete} />

			<EditFileDialog
				isOpen={isDialogOpen}
				fileName={editingFile?.name ?? ""}
				content={editContent}
				onContentChange={setEditContent}
				onClose={closeDialog}
				onSave={saveEditing}
			/>
		</PageContainer>
	);
}
