import { Check, FileText, Pencil, Trash2, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { FileEntry } from "@/api/hooks/useFiles"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatBytes } from "@/lib/formatBytes"
import { cn } from "@/lib/utils"

type FileListItemProps = {
	file: FileEntry
	isEditing: boolean
	editValue: string
	error: string | null
	onStartEditing: (file: FileEntry) => void
	onConfirmEditing: () => void
	onCancelEditing: () => void
	onDelete: (name: string) => void
	onEditChange: (value: string) => void
	onEditKeyDown: (event: React.KeyboardEvent) => void
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
}: FileListItemProps) {
	const { t } = useTranslation()
	return (
		<div className="flex items-center justify-between px-4 py-3 hover:bg-muted/50">
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<FileText size={18} className="shrink-0 text-muted-foreground" />
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
						<p className="text-muted-foreground text-xs">
							{formatBytes(file.size ?? 0)} -
							{file.lastModified
								? new Date(file.lastModified).toLocaleDateString()
								: "-"}
						</p>
					</div>
				)}
			</div>
			{!isEditing && (
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onStartEditing(file)}
						className="h-8 w-8 p-0"
						aria-label={t("botContext.fileListItem.renameFile")}
					>
						<Pencil size={16} />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => onDelete(file.name)}
						className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
						aria-label={t("botContext.fileListItem.deleteFile")}
					>
						<Trash2 size={16} />
					</Button>
				</div>
			)}
		</div>
	)
}
