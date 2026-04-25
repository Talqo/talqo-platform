import { AlertCircle, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export type UploadError = {
	fileName: string
	reason: "duplicate" | "invalid"
}

type UploadErrorAlertProps = {
	errors: UploadError[]
	onDismiss: () => void
}

export function UploadErrorAlert({ errors, onDismiss }: UploadErrorAlertProps) {
	if (errors.length === 0) return null

	return (
		<Alert
			variant="destructive"
			className="mb-4 flex flex-row items-start gap-3"
		>
			<AlertCircle size={18} className="mt-0.5 shrink-0" />
			<div className="min-w-0 flex-1">
				<AlertTitle>
					Failed to upload {errors.length} file{errors.length > 1 ? "s" : ""}
				</AlertTitle>
				<AlertDescription>
					<ul className="mt-1 space-y-1">
						{errors.map((error) => (
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
				onClick={onDismiss}
				className="shrink-0 rounded-md p-1 opacity-70 hover:bg-destructive/20 hover:opacity-100"
				aria-label="Dismiss errors"
			>
				<X size={16} />
			</button>
		</Alert>
	)
}
