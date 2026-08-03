import { FileText, Plus, Upload } from "lucide-react"
import { useCallback, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { FileEntry } from "@/api/hooks/useFiles"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileListEmpty } from "./FileListEmpty"
import { type DisplayedFile, FileListItem } from "./FileListItem"
import {
	UploadErrorAlert,
	type UploadValidationError,
} from "./UploadErrorAlert"
import { useDragAndDrop } from "./useDragAndDrop"
import { useFileValidation } from "./useFileValidation"

type FileListProps = {
	files: FileEntry[]
	onRename: (
		name: string,
		newName: string,
	) => Promise<{ success: boolean; error?: "duplicate" | "server" }>
	onDelete: (name: string) => void
	onFilesUploaded: (
		files: File[],
		onUploaded: (fileName: string) => void,
	) => Promise<string[]>
	onReindex: (name: string) => Promise<void>
}

type EditingState = {
	name: string
	editValue: string
}

type TransientUpload = {
	file: File
	status: "uploading" | "embedding" | "failed"
}

export function FileList({
	files,
	onRename,
	onDelete,
	onFilesUploaded,
	onReindex,
}: FileListProps) {
	const { t } = useTranslation()
	const [editing, setEditing] = useState<EditingState | null>(null)
	const [renameError, setRenameError] = useState<string | null>(null)
	const [uploadErrors, setUploadErrors] = useState<UploadValidationError[]>([])
	const [transientUploads, setTransientUploads] = useState<
		Map<string, TransientUpload>
	>(new Map())
	const fileInputRef = useRef<HTMLInputElement>(null)
	const { isTextFile } = useFileValidation()

	const uploadFiles = useCallback(
		async (filesToUpload: File[]) => {
			setTransientUploads((current) => {
				const next = new Map(current)
				for (const file of filesToUpload) {
					next.set(file.name, { file, status: "uploading" })
				}
				return next
			})

			const errors = await onFilesUploaded(filesToUpload, (fileName) => {
				setTransientUploads((current) => {
					const upload = current.get(fileName)
					if (!upload) return current
					const next = new Map(current)
					next.set(fileName, { ...upload, status: "embedding" })
					return next
				})
			})
			const failedNames = new Set(errors)
			setTransientUploads((current) => {
				const next = new Map(current)
				for (const file of filesToUpload) {
					if (failedNames.has(file.name)) {
						next.set(file.name, { file, status: "failed" })
					} else {
						next.delete(file.name)
					}
				}
				return next
			})
		},
		[onFilesUploaded],
	)

	const validateAndUpload = useCallback(
		async (fileList: File[]) => {
			if (!fileList.length) return

			const existingNames = new Set([
				...files.map((f) => f.name.toLowerCase()),
				...[...transientUploads.keys()].map((name) => name.toLowerCase()),
			])
			const errors: UploadValidationError[] = []

			const validFiles = fileList.filter((file) => {
				if (!isTextFile(file)) {
					errors.push({ fileName: file.name, reason: "invalid" })
					return false
				}
				if (existingNames.has(file.name.toLowerCase())) {
					errors.push({ fileName: file.name, reason: "duplicate" })
					return false
				}
				return true
			})

			if (errors.length > 0) {
				setUploadErrors(errors)
			}

			if (validFiles.length > 0) {
				await uploadFiles(validFiles)
			}
		},
		[files, isTextFile, transientUploads, uploadFiles],
	)

	const handleRetryUpload = useCallback(
		(file: File) => {
			void uploadFiles([file])
		},
		[uploadFiles],
	)

	const { isDragging, bindDragEvents } = useDragAndDrop({
		onDrop: validateAndUpload,
	})

	const handleFileInputChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const filesArray = event.target.files
				? Array.from(event.target.files)
				: []
			validateAndUpload(filesArray)
			if (fileInputRef.current) {
				fileInputRef.current.value = ""
			}
		},
		[validateAndUpload],
	)

	const dismissErrors = useCallback(() => {
		setUploadErrors([])
	}, [])

	const handleStartEditing = useCallback((file: FileEntry) => {
		const ext = file.name.includes(".")
			? file.name.slice(file.name.lastIndexOf("."))
			: ""
		const nameWithoutExt = ext
			? file.name.slice(0, file.name.lastIndexOf(ext))
			: file.name
		setEditing({ name: file.name, editValue: nameWithoutExt })
		setRenameError(null)
	}, [])

	const handleCancelEditing = useCallback(() => {
		setEditing(null)
		setRenameError(null)
	}, [])

	const handleConfirmEditing = useCallback(async () => {
		if (!editing) return

		const result = await onRename(editing.name, editing.editValue)
		if (result.success) {
			setEditing(null)
			setRenameError(null)
		} else if (result.error === "duplicate") {
			setRenameError(t("botContext.fileListItem.duplicateName"))
		} else {
			setRenameError(t("botContext.fileListItem.renameFailed"))
		}
	}, [editing, onRename, t])

	const handleEditChange = useCallback((value: string) => {
		setEditing((prev) => (prev ? { ...prev, editValue: value } : null))
		setRenameError(null)
	}, [])

	const handleEditKeyDown = useCallback(
		(event: React.KeyboardEvent) => {
			if (event.key === "Enter") {
				handleConfirmEditing()
			} else if (event.key === "Escape") {
				handleCancelEditing()
			}
		},
		[handleConfirmEditing, handleCancelEditing],
	)

	const displayedFiles = [
		...files.filter((file) => !transientUploads.has(file.name)),
		...[...transientUploads.values()].map(
			({ file, status }): DisplayedFile => ({
				name: file.name,
				type: "file",
				size: file.size,
				uploadStatus: status,
				sourceFile: file,
			}),
		),
	]

	return (
		<Card
			className={isDragging ? "border-primary bg-primary/5" : undefined}
			{...bindDragEvents}
		>
			{isDragging && (
				<div className="border-primary/20 border-b bg-primary/5 py-4 text-center">
					<div className="flex items-center justify-center gap-2 font-medium text-primary text-sm">
						<Upload size={16} />
						{t("botContext.fileList.dropFilesHere")}
					</div>
				</div>
			)}
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-base">
					<span className="flex items-center gap-2">
						<FileText size={18} />
						{t("botContext.fileList.contextFiles", {
							count: displayedFiles.length,
						})}
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={() => fileInputRef.current?.click()}
						className="h-8 gap-1"
					>
						<Plus size={16} />
						<span className="hidden sm:inline">
							{t("botContext.fileList.addFile")}
						</span>
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

				{displayedFiles.length === 0 ? (
					<FileListEmpty />
				) : (
					<div className="divide-y divide-border rounded-lg border border-border">
						{displayedFiles.map((file) => (
							<FileListItem
								key={file.name}
								file={file}
								isEditing={editing?.name === file.name}
								editValue={editing?.name === file.name ? editing.editValue : ""}
								error={renameError}
								onStartEditing={handleStartEditing}
								onConfirmEditing={handleConfirmEditing}
								onCancelEditing={handleCancelEditing}
								onDelete={onDelete}
								onEditChange={handleEditChange}
								onEditKeyDown={handleEditKeyDown}
								onRetryUpload={handleRetryUpload}
								onReindex={onReindex}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	)
}
