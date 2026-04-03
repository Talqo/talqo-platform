import {
	AlertCircle,
	Check,
	FileText,
	Pencil,
	Plus,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatBytes } from "@/lib/formatBytes";
import { cn } from "@/lib/utils";
import type { ContextFile } from "./types";

interface FileListProps {
	files: ContextFile[];
	onRename: (
		id: string,
		newName: string,
	) => { success: boolean; error?: "duplicate" };
	onDelete: (id: string) => void;
	onFilesUploaded: (files: FileList | null) => Promise<ContextFile[]>;
}

interface EditingState {
	id: string;
	name: string;
}

interface UploadError {
	fileName: string;
	reason: "duplicate" | "invalid";
}

export function FileList({
	files,
	onRename,
	onDelete,
	onFilesUploaded,
}: FileListProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [editing, setEditing] = useState<EditingState | null>(null);
	const [renameError, setRenameError] = useState<string | null>(null);
	const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const getFileExtension = useCallback((filename: string): string => {
		const lastDot = filename.lastIndexOf(".");
		return lastDot > 0 ? filename.slice(lastDot) : "";
	}, []);

	const isTextFile = useCallback((file: File): boolean => {
		if (file.type.startsWith("text/")) return true;

		const textExtensions = new Set([
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

		const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
		return textExtensions.has(ext);
	}, []);

	const validateAndUpload = useCallback(
		async (fileList: FileList | null) => {
			if (!fileList) return;

			const existingNames = new Set(files.map((f) => f.name.toLowerCase()));
			const errors: UploadError[] = [];

			const validFiles = Array.from(fileList).filter((file) => {
				if (!isTextFile(file)) {
					errors.push({ fileName: file.name, reason: "invalid" });
					return false;
				}
				if (existingNames.has(file.name.toLowerCase())) {
					errors.push({ fileName: file.name, reason: "duplicate" });
					return false;
				}
				return true;
			});

			if (errors.length > 0) {
				setUploadErrors(errors);
			}

			if (validFiles.length > 0) {
				const dataTransfer = new DataTransfer();
				for (const file of validFiles) {
					dataTransfer.items.add(file);
				}
				await onFilesUploaded(dataTransfer.files);
			}
		},
		[files, isTextFile, onFilesUploaded],
	);

	const handleDragOver = useCallback((event: React.DragEvent) => {
		event.preventDefault();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((event: React.DragEvent) => {
		event.preventDefault();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback(
		(event: React.DragEvent) => {
			event.preventDefault();
			setIsDragging(false);
			validateAndUpload(event.dataTransfer.files);
		},
		[validateAndUpload],
	);

	const handleFileInputChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			validateAndUpload(event.target.files);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		},
		[validateAndUpload],
	);

	const dismissErrors = useCallback(() => {
		setUploadErrors([]);
	}, []);

	const startEditing = useCallback(
		(file: ContextFile) => {
			const ext = getFileExtension(file.name);
			const nameWithoutExt = ext
				? file.name.slice(0, file.name.lastIndexOf(ext))
				: file.name;
			setEditing({ id: file.id, name: nameWithoutExt });
			setRenameError(null);
		},
		[getFileExtension],
	);

	const cancelEditing = useCallback(() => {
		setEditing(null);
		setRenameError(null);
	}, []);

	const confirmEditing = useCallback(() => {
		if (!editing) return;

		const result = onRename(editing.id, editing.name);
		if (result.success) {
			setEditing(null);
			setRenameError(null);
		} else if (result.error === "duplicate") {
			setRenameError("A file with this name already exists");
		}
	}, [editing, onRename]);

	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (event.key === "Enter") {
				confirmEditing();
			} else if (event.key === "Escape") {
				cancelEditing();
			}
		},
		[confirmEditing, cancelEditing],
	);

	return (
		<Card
			className={cn(
				"transition-colors",
				isDragging && "border-primary bg-primary/5",
			)}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-base">
					<span className="flex items-center gap-2">
						<FileText size={18} />
						Context Files ({files.length})
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => fileInputRef.current?.click()}
						className="h-8 gap-1"
					>
						<Plus size={16} />
						<span className="hidden sm:inline">Add</span>
					</Button>
					<input
						ref={fileInputRef}
						type="file"
						accept="text/*"
						multiple
						className="hidden"
						onChange={handleFileInputChange}
					/>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{uploadErrors.length > 0 && (
					<Alert variant="destructive" className="mb-4">
						<AlertCircle size={18} className="shrink-0" />
						<div className="flex-1">
							<AlertTitle>
								Failed to upload {uploadErrors.length} file
								{uploadErrors.length > 1 ? "s" : ""}
							</AlertTitle>
							<AlertDescription>
								<ul className="mt-1 space-y-1">
									{uploadErrors.map((error) => (
										<li key={`${error.fileName}-${error.reason}`}>
											• {error.fileName}:{" "}
											{error.reason === "duplicate"
												? "File with this name already exists"
												: "Invalid file type"}
										</li>
									))}
								</ul>
							</AlertDescription>
						</div>
						<button
							type="button"
							onClick={dismissErrors}
							className="shrink-0 rounded-md p-1 opacity-70 hover:bg-destructive/20 hover:opacity-100"
							aria-label="Dismiss errors"
						>
							<X size={16} />
						</button>
					</Alert>
				)}
				{isDragging && (
					<div className="mb-4 rounded-lg border-2 border-primary border-dashed bg-primary/5 p-8 text-center">
						<FileText size={32} className="mx-auto mb-2 text-primary" />
						<p className="font-medium text-primary">Drop files here</p>
					</div>
				)}
				{files.length === 0 ? (
					<div className="rounded-lg border-2 border-border border-dashed py-12 text-center text-muted-foreground">
						<FileText
							size={32}
							className="mx-auto mb-3 text-muted-foreground/50"
						/>
						<p className="mb-1 font-medium">No files uploaded yet</p>
						<p className="text-sm">
							Drag and drop text files here or use the + button to add them
						</p>
					</div>
				) : (
					<div className="divide-y divide-border rounded-lg border border-border">
						{files.map((file) => (
							<div
								key={file.id}
								className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
							>
								<div className="flex min-w-0 flex-1 items-center gap-3">
									<FileText
										size={18}
										className="shrink-0 text-muted-foreground"
									/>
									{editing?.id === file.id ? (
										<div className="flex flex-1 flex-col gap-1">
											<div className="flex flex-1 items-center gap-2">
												<Input
													value={editing.name}
													onChange={(e) => {
														setEditing({
															...editing,
															name: e.target.value,
														});
														setRenameError(null);
													}}
													onKeyDown={handleKeyDown}
													className={cn(
														"h-8 flex-1",
														renameError &&
															"border-destructive focus-visible:ring-destructive",
													)}
													autoFocus
												/>
												<Button
													variant="ghost"
													size="sm"
													onClick={confirmEditing}
													className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
													aria-label="Confirm rename"
												>
													<Check size={16} />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={cancelEditing}
													className="h-8 w-8 p-0"
													aria-label="Cancel rename"
												>
													<X size={16} />
												</Button>
											</div>
											{renameError && (
												<p className="text-destructive text-xs">
													{renameError}
												</p>
											)}
										</div>
									) : (
										<div className="min-w-0 flex-1">
											<p className="truncate font-medium text-sm">
												{file.name}
											</p>
											<p className="text-muted-foreground text-xs">
												{formatBytes(file.size)} •{" "}
												{file.updatedAt.toLocaleDateString()}
											</p>
										</div>
									)}
								</div>
								{editing?.id !== file.id && (
									<div className="flex items-center gap-1">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => startEditing(file)}
											className="h-8 w-8 p-0"
											aria-label="Rename file"
										>
											<Pencil size={16} />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => onDelete(file.id)}
											className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
											aria-label="Delete file"
										>
											<Trash2 size={16} />
										</Button>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
