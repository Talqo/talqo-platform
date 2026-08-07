import {
	AlertTriangle,
	Check,
	CircleCheck,
	FileText,
	LoaderCircle,
	Pencil,
	RefreshCw,
	Trash2,
	X,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { FileEntry } from "@/api/hooks/useFiles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatBytes } from "@/lib/formatBytes"
import { cn } from "@/lib/utils"

type FileListItemProps = {
	file: DisplayedFile
	isEditing: boolean
	editValue: string
	error: string | null
	onStartEditing: (file: FileEntry) => void
	onConfirmEditing: () => void
	onCancelEditing: () => void
	onDelete: (name: string) => void
	onEditChange: (value: string) => void
	onEditKeyDown: (event: React.KeyboardEvent) => void
	onRetryUpload: (file: File) => void
	onReindex: (name: string) => Promise<void>
}

export type DisplayedFile = FileEntry & {
	uploadStatus?: "uploading" | "embedding" | "failed"
	sourceFile?: File
}

type FileStatus = {
	label: string
	working: boolean
	icon: "indexed" | "stale" | "failed"
	canRetryEmbedding: boolean
}

const persistedStatuses: Record<
	NonNullable<DisplayedFile["embeddingStatus"]>,
	Pick<FileStatus, "icon" | "canRetryEmbedding">
> = {
	indexed: { icon: "indexed", canRetryEmbedding: false },
	stale: { icon: "stale", canRetryEmbedding: true },
	failed: { icon: "failed", canRetryEmbedding: true },
}

export function FileListItem({
	file,
	isEditing,
	editValue,
	error,
	onStartEditing,
	onConfirmEditing,
	onCancelEditing,
	onDelete,
	onEditChange,
	onEditKeyDown,
	onRetryUpload,
	onReindex,
}: FileListItemProps) {
	const { t } = useTranslation()
	const [isReindexing, setIsReindexing] = useState(false)
	const transientLabels = {
		uploading: t("botContext.fileListItem.uploading"),
		embedding: t("botContext.fileListItem.embedding"),
		failed: t("botContext.fileListItem.uploadFailed"),
	}
	const transientStatus: FileStatus | null = file.uploadStatus
		? {
				label: transientLabels[file.uploadStatus],
				working: file.uploadStatus !== "failed",
				icon: "failed",
				canRetryEmbedding: false,
			}
		: null
	const getFileStatus = (): FileStatus => {
		if (transientStatus) return transientStatus
		if (isReindexing) {
			return {
				label: t("botContext.fileListItem.embedding"),
				working: true,
				icon: "failed",
				canRetryEmbedding: false,
			}
		}
		const status = file.embeddingStatus
		if (!status) {
			return {
				label: t("botContext.fileListItem.notEmbedded"),
				working: false,
				icon: "failed",
				canRetryEmbedding: true,
			}
		}
		const persistedLabels = {
			indexed: t("botContext.fileListItem.embedded"),
			stale: t("botContext.fileListItem.staleEmbedding"),
			failed: {
				insufficient_balance: t("botContext.fileListItem.insufficientBalance"),
				indexing_error: t("botContext.fileListItem.indexingFailed"),
				provider_error: t("botContext.fileListItem.embeddingFailed"),
			},
		}
		return {
			label:
				status === "failed"
					? persistedLabels.failed[file.embeddingError ?? "provider_error"]
					: persistedLabels[status],
			working: false,
			...persistedStatuses[status],
		}
	}
	const status = getFileStatus()

	const handleReindex = async () => {
		setIsReindexing(true)
		try {
			await onReindex(file.name)
		} finally {
			setIsReindexing(false)
		}
	}
	const statusIcon = status.working ? (
		<LoaderCircle size={16} className="animate-spin text-primary" />
	) : status.icon === "indexed" ? (
		<CircleCheck size={16} className="text-green-600" />
	) : status.icon === "stale" ? (
		<AlertTriangle size={16} className="text-amber-600" />
	) : (
		<AlertTriangle size={16} className="text-destructive" />
	)

	return (
		<div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50">
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<FileText size={18} className="shrink-0 text-muted-foreground" />
				<span
					role="img"
					title={status.label}
					aria-label={status.label}
					className="cursor-help"
				>
					{statusIcon}
				</span>
				{isEditing ? (
					<div className="flex flex-1 flex-col gap-1">
						<div className="flex flex-1 items-center gap-2">
							<Input
								value={editValue}
								onChange={(e) => onEditChange(e.target.value)}
								onKeyDown={onEditKeyDown}
								className={cn(
									"h-8 flex-1",
									error && "border-destructive focus-visible:ring-destructive",
								)}
								autoFocus
							/>
							<Button
								variant="ghost"
								size="sm"
								onClick={onConfirmEditing}
								className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
								aria-label={t("botContext.fileListItem.confirmRename")}
							>
								<Check size={16} />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={onCancelEditing}
								className="h-8 w-8 p-0"
								aria-label={t("botContext.fileListItem.cancelRename")}
							>
								<X size={16} />
							</Button>
						</div>
						{error && <p className="text-destructive text-xs">{error}</p>}
					</div>
				) : (
					<div className="min-w-0 flex-1">
						<p className="truncate font-medium text-sm">{file.name}</p>
						{status.working ? (
							<p className="font-medium text-primary text-xs">{status.label}</p>
						) : (
							<p className="text-muted-foreground text-xs">
								{formatBytes(file.size ?? 0)} -
								{file.lastModified
									? new Date(file.lastModified).toLocaleDateString()
									: "-"}
							</p>
						)}
					</div>
				)}
			</div>
			{!isEditing && (
				<div className="flex items-center gap-1">
					{file.uploadStatus === "failed" && file.sourceFile && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onRetryUpload(file.sourceFile as File)}
							className="h-8 gap-1 px-2"
						>
							<RefreshCw size={14} />
							{t("botContext.fileListItem.retryUpload")}
						</Button>
					)}
					{status.canRetryEmbedding && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleReindex}
							disabled={isReindexing}
							className="h-8 gap-1 px-2"
						>
							<RefreshCw
								size={14}
								className={isReindexing ? "animate-spin" : undefined}
							/>
							{t("botContext.fileListItem.retryEmbedding")}
						</Button>
					)}
					{!file.uploadStatus && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onStartEditing(file)}
							className="h-8 w-8 p-0"
							aria-label={t("botContext.fileListItem.renameFile")}
						>
							<Pencil size={16} />
						</Button>
					)}
					{!file.uploadStatus && (
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onDelete(file.name)}
							className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
							aria-label={t("botContext.fileListItem.deleteFile")}
						>
							<Trash2 size={16} />
						</Button>
					)}
				</div>
			)}
		</div>
	)
}
