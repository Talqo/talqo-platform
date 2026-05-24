import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

export type ConfirmDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description?: string
	confirmLabel: string
	cancelLabel?: string
	variant?: "default" | "destructive"
	onConfirm: () => void
	confirmLoading?: boolean
	disabled?: boolean
	error?: string | null
	trigger?: React.ReactNode
	children?: React.ReactNode
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmLabel,
	cancelLabel = "Cancel",
	variant = "default",
	onConfirm,
	confirmLoading = false,
	disabled = false,
	error = null,
	trigger,
	children,
}: ConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{trigger}
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				{children}
				{error && (
					<Alert variant="destructive" className="mt-4">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={confirmLoading}
						type="button"
					>
						{cancelLabel}
					</Button>
					<Button
						variant={variant}
						onClick={onConfirm}
						disabled={disabled || confirmLoading}
						type="button"
					>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
