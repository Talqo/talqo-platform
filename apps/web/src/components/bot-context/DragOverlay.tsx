import { FileText } from "lucide-react"
import { useTranslation } from "react-i18next"

type DragOverlayProps = {
	isVisible: boolean
}

export function DragOverlay({ isVisible }: DragOverlayProps) {
	const { t } = useTranslation()
	if (!isVisible) return null

	return (
		<div className="mb-4 rounded-lg border-2 border-primary border-dashed bg-primary/5 p-8 text-center">
			<FileText size={32} className="mx-auto mb-2 text-primary" />
			<p className="font-medium text-primary">
				{t("botContext.dragOverlay.dropFilesHere")}
			</p>
		</div>
	)
}
