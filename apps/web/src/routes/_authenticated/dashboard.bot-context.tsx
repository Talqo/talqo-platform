import { createFileRoute } from "@tanstack/react-router"
import { AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
	useDeleteFile,
	useFiles,
	useReindexFile,
	useRenameFile,
	useUploadFile,
} from "@/api/hooks/useFiles"
import { FileList } from "@/components/bot-context"
import type { UploadError } from "@/components/bot-context/UploadErrorAlert"
import { PageContainer } from "@/components/layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export const Route = createFileRoute("/_authenticated/dashboard/bot-context")({
	component: BotContextPage,
})

function BotContextPage() {
	const { t } = useTranslation()
	const { data: files = [], isLoading, isError, error } = useFiles()
	const uploadFile = useUploadFile()
	const deleteFile = useDeleteFile()
	const renameFile = useRenameFile()
	const reindexFile = useReindexFile()

	const handleFileUpload = async (
		uploadedFiles: File[],
		onUploaded: (fileName: string) => void,
	): Promise<UploadError[]> => {
		const results = await Promise.all(
			uploadedFiles.map(async (file): Promise<UploadError | null> => {
				try {
					await uploadFile.mutateAsync(file)
				} catch {
					return { fileName: file.name, reason: "server" }
				}

				onUploaded(file.name)
				try {
					await reindexFile.mutateAsync(file.name)
				} catch {
					// The uploaded file remains available for another embedding attempt.
				}
				return null
			}),
		)
		return results.filter((result): result is UploadError => result !== null)
	}

	const handleDelete = (name: string): void => {
		deleteFile.mutate(name)
	}

	const handleReindex = async (name: string): Promise<void> => {
		try {
			await reindexFile.mutateAsync(name)
		} catch {
			// The existing failed state remains visible and retryable.
		}
	}

	const handleRename = async (
		name: string,
		newName: string,
	): Promise<{ success: boolean; error?: "duplicate" | "server" }> => {
		const trimmedName = newName.trim()
		if (!trimmedName) return { success: false }

		const target = files.find((f) => f.name === name)
		if (!target) return { success: false }

		const ext = target.name.includes(".")
			? target.name.slice(target.name.lastIndexOf("."))
			: ""
		const newNameWithExt = trimmedName.endsWith(ext)
			? trimmedName
			: trimmedName + ext

		if (newNameWithExt === name) return { success: true }

		const isDuplicate = files.some(
			(f) =>
				f.name !== name &&
				f.name.toLowerCase() === newNameWithExt.toLowerCase(),
		)
		if (isDuplicate) return { success: false, error: "duplicate" }

		try {
			await renameFile.mutateAsync({ from: name, to: newNameWithExt })
			return { success: true }
		} catch {
			return { success: false, error: "server" }
		}
	}

	return (
		<PageContainer>
			<div>
				<h1 className="font-bold text-2xl text-foreground tracking-tight">
					{t("dashboard.botContext.title")}
				</h1>
				<p className="text-muted-foreground">
					{t("dashboard.botContext.subtitle")}
				</p>
			</div>

			{isError && (
				<Alert variant="destructive">
					<AlertCircle size={18} />
					<AlertTitle>{t("dashboard.botContext.failedToLoadFiles")}</AlertTitle>
					<AlertDescription>
						{error instanceof Error
							? error.message
							: t("dashboard.botContext.unexpectedError")}
					</AlertDescription>
				</Alert>
			)}

			<FileList
				files={isLoading ? [] : files}
				onRename={handleRename}
				onDelete={handleDelete}
				onFilesUploaded={handleFileUpload}
				onReindex={handleReindex}
			/>
		</PageContainer>
	)
}
