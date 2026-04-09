import { FileText, Plus, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileListEmpty } from "./FileListEmpty";
import { FileListItem } from "./FileListItem";
import type { ContextFile } from "./types";
import { type UploadError, UploadErrorAlert } from "./UploadErrorAlert";
import { useDragAndDrop } from "./useDragAndDrop";
import { useFileValidation } from "./useFileValidation";

interface FileListProps {
	files: ContextFile[];
	onRename: (
		id: string,
		newName: string,
	) => { success: boolean; error?: "duplicate" };
	onDelete: (id: string) => void;
	onFilesUploaded: (files: File[]) => Promise<ContextFile[]>;
}

interface EditingState {
	id: string;
	name: string;
}

export function FileList({
	files,
	onRename,
	onDelete,
	onFilesUploaded,
}: FileListProps) {
	const [editing, setEditing] = useState<EditingState | null>(null);
	const [renameError, setRenameError] = useState<string | null>(null);
	const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { isTextFile } = useFileValidation();

	const validateAndUpload = useCallback(
		async (fileList: File[]) => {
			if (!fileList.length) return;

			const existingNames = new Set(files.map((f) => f.name.toLowerCase()));
			const errors: UploadError[] = [];

			const validFiles = fileList.filter((file) => {
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
				await onFilesUploaded(validFiles);
			}
		},
		[files, isTextFile, onFilesUploaded],
	);

	const { isDragging, bindDragEvents } = useDragAndDrop({
		onDrop: validateAndUpload,
	});

	const handleFileInputChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const filesArray = event.target.files
				? Array.from(event.target.files)
				: [];
			validateAndUpload(filesArray);
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		},
		[validateAndUpload],
	);

	const dismissErrors = useCallback(() => {
		setUploadErrors([]);
	}, []);

	const handleStartEditing = useCallback((file: ContextFile) => {
		const ext = file.name.includes(".")
			? file.name.slice(file.name.lastIndexOf("."))
			: "";
		const nameWithoutExt = ext
			? file.name.slice(0, file.name.lastIndexOf(ext))
			: file.name;
		setEditing({ id: file.id, name: nameWithoutExt });
		setRenameError(null);
	}, []);

	const handleCancelEditing = useCallback(() => {
		setEditing(null);
		setRenameError(null);
	}, []);

	const handleConfirmEditing = useCallback(() => {
		if (!editing) return;

		const result = onRename(editing.id, editing.name);
		if (result.success) {
			setEditing(null);
			setRenameError(null);
		} else if (result.error === "duplicate") {
			setRenameError("A file with this name already exists");
		}
	}, [editing, onRename]);

	const handleEditChange = useCallback((value: string) => {
		setEditing((prev) => (prev ? { ...prev, name: value } : null));
		setRenameError(null);
	}, []);

	const handleEditKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (event.key === "Enter") {
				handleConfirmEditing();
			} else if (event.key === "Escape") {
				handleCancelEditing();
			}
		},
		[handleConfirmEditing, handleCancelEditing],
	);

	return (
		<Card
			className={isDragging ? "border-primary bg-primary/5" : undefined}
			{...bindDragEvents}
		>
			{isDragging && (
				<div className="border-primary/20 border-b bg-primary/5 py-4 text-center">
					<div className="flex items-center justify-center gap-2 font-medium text-primary text-sm">
						<Upload size={16} />
						Drop files here
					</div>
				</div>
			)}
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
						accept="*/*"
						multiple
						className="hidden"
						onChange={handleFileInputChange}
					/>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<UploadErrorAlert errors={uploadErrors} onDismiss={dismissErrors} />

				{files.length === 0 ? (
					<FileListEmpty />
				) : (
					<div className="divide-y divide-border rounded-lg border border-border">
						{files.map((file) => (
							<FileListItem
								key={file.id}
								file={file}
								isEditing={editing?.id === file.id}
								editValue={editing?.id === file.id ? editing.name : ""}
								error={renameError}
								onStartEditing={handleStartEditing}
								onConfirmEditing={handleConfirmEditing}
								onCancelEditing={handleCancelEditing}
								onDelete={onDelete}
								onEditChange={handleEditChange}
								onEditKeyDown={handleEditKeyDown}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
