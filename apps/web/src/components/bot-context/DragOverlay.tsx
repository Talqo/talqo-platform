import { FileText } from "lucide-react"

interface DragOverlayProps {
	isVisible: boolean
}

export function DragOverlay({ isVisible }: DragOverlayProps) {
	if (!isVisible) return null

	return (
		<div className="mb-4 rounded-lg border-2 border-primary border-dashed bg-primary/5 p-8 text-center">
			<FileText size={32} className="mx-auto mb-2 text-primary" />
			<p className="font-medium text-primary">Drop files here</p>
		</div>
	)
}
