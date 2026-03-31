import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface EditFileDialogProps {
	isOpen: boolean;
	fileName: string;
	content: string;
	onContentChange: (content: string) => void;
	onClose: () => void;
	onSave: () => void;
}

export function EditFileDialog({
	isOpen,
	fileName,
	content,
	onContentChange,
	onClose,
	onSave,
}: EditFileDialogProps) {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Edit File: {fileName}</DialogTitle>
					<DialogDescription>
						Edit the content of your context file. Changes will be saved to the
						database.
					</DialogDescription>
				</DialogHeader>
				<div className="py-4">
					<Textarea
						value={content}
						onChange={(e) => onContentChange(e.target.value)}
						className="min-h-[300px] font-mono text-sm"
						placeholder="Enter file content here..."
					/>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={onSave}>Save Changes</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
