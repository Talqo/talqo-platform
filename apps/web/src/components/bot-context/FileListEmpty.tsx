import { FileText } from "lucide-react";

export function FileListEmpty() {
	return (
		<div className="rounded-lg border-2 border-border border-dashed py-12 text-center text-muted-foreground">
			<FileText size={32} className="mx-auto mb-3 text-muted-foreground/50" />
			<p className="mb-1 font-medium">No files uploaded yet</p>
			<p className="text-sm">
				Drag and drop text files here or use the + button to add them
			</p>
		</div>
	);
}
