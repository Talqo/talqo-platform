import { Edit2, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContextFile } from "./types";

interface FileListProps {
	files: ContextFile[];
	onEdit: (file: ContextFile) => void;
	onDelete: (id: string) => void;
}

export function FileList({ files, onEdit, onDelete }: FileListProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-base">
					<span className="flex items-center gap-2">
						<FileText size={18} />
						Context Files ({files.length})
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{files.length === 0 ? (
					<div className="py-8 text-center text-muted-foreground">
						No files uploaded yet. Add .txt files to provide context for your
						bot.
					</div>
				) : (
					<div className="divide-y divide-border rounded-lg border border-border">
						{files.map((file) => (
							<div
								key={file.id}
								className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
							>
								<div className="flex items-center gap-3">
									<FileText size={18} className="text-muted-foreground" />
									<span className="font-medium text-sm">{file.name}</span>
								</div>
								<div className="flex items-center gap-1">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onEdit(file)}
										className="h-8 w-8 p-0"
										aria-label="Edit file"
									>
										<Edit2 size={16} />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onDelete(file.id)}
										className="h-8 w-8 p-0 text-destructive hover:text-destructive/80"
										aria-label="Delete file"
									>
										<Trash2 size={16} />
									</Button>
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
