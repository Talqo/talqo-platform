import { createFileRoute } from "@tanstack/react-router"
import { AlertCircle } from "lucide-react"
import {
	useDeleteFile,
	useFiles,
	useRenameFile,
	useUploadFile,
} from "@/api/hooks/useFiles"
import { FileList } from "@/components/bot-context"
import { PageContainer } from "@/components/layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export const Route = createFileRoute("/_authenticated/dashboard/bot-context")({
	component: BotContextPage,
})

function BotContextPage() {
	const { data: files = [], isLoading, isError, error } = useFiles()
	const uploadFile = useUploadFile()
	const deleteFile = useDeleteFile()
	const renameFile = useRenameFile()

	const handleFileUpload = async (uploadedFiles: File[]): Promise<void> => {
		await Promise.all(uploadedFiles.map((f) => uploadFile.mutateAsync(f)))
	}

	const handleDelete = (name: string): void => {
		deleteFile.mutate(name)
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
					Bot Context
				</h1>
				<p className="text-muted-foreground">
					Upload and manage text files that provide context for your AI
					assistant.
				</p>
			</div>

			{isError && (
				<Alert variant="destructive">
					<AlertCircle size={18} />
					<AlertTitle>Failed to load files</AlertTitle>
					<AlertDescription>
						{error instanceof Error
							? error.message
							: "An unexpected error occurred. Please try again."}
					</AlertDescription>
				</Alert>
			)}

			<FileList
				files={isLoading ? [] : files}
				onRename={handleRename}
				onDelete={handleDelete}
				onFilesUploaded={handleFileUpload}
			/>
		</PageContainer>
	)
}
