import { FileText, Plus, Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FileUploadZoneProps {
	onFilesUploaded: (files: FileList | null) => void;
}

export function FileUploadZone({ onFilesUploaded }: FileUploadZoneProps) {
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleDrop = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			event.preventDefault();
			setIsDragging(false);
			onFilesUploaded(event.dataTransfer.files);
		},
		[onFilesUploaded],
	);

	const handleDragOver = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			event.preventDefault();
			setIsDragging(true);
		},
		[],
	);

	const handleDragLeave = useCallback(
		(event: React.DragEvent<HTMLDivElement>) => {
			event.preventDefault();
			setIsDragging(false);
		},
		[],
	);

	const handleFileInputChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			onFilesUploaded(event.target.files);
			// Reset input value to allow uploading the same file again
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		},
		[onFilesUploaded],
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<Upload size={18} />
					Upload Files
				</CardTitle>
			</CardHeader>
			<CardContent>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: Drop zone for file upload */}
				<div
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					className={cn(
						"flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
						isDragging
							? "border-primary bg-primary/5"
							: "border-border hover:border-muted-foreground/50",
					)}
				>
					<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
						<FileText size={24} className="text-muted-foreground" />
					</div>
					<p className="mb-2 font-medium text-sm">
						Drag and drop .txt files here
					</p>
					<p className="mb-4 text-muted-foreground text-sm">or</p>
					<Button
						variant="outline"
						onClick={() => fileInputRef.current?.click()}
					>
						<Plus size={16} className="mr-2" />
						Browse Files
					</Button>
					<input
						ref={fileInputRef}
						type="file"
						accept=".txt,text/plain"
						multiple
						className="hidden"
						onChange={handleFileInputChange}
					/>
					<p className="mt-4 text-muted-foreground text-xs">
						Only .txt files are supported
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
