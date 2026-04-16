import { Link } from "@tanstack/react-router"
import { Bot, ChevronRight, X } from "lucide-react"
import { useState } from "react"
import { useDismissWidgetSetup } from "@/api/hooks"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface OnboardingPopupProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function OnboardingPopup({ open, onOpenChange }: OnboardingPopupProps) {
	const dismissMutation = useDismissWidgetSetup()
	const [dontShowAgain, setDontShowAgain] = useState(false)

	const handleDismiss = async () => {
		if (dontShowAgain) {
			await dismissMutation.mutateAsync()
		}
		onOpenChange(false)
	}

	const handleSetUpNow = () => {
		if (dontShowAgain) {
			dismissMutation.mutate()
		}
		onOpenChange(false)
	}

	return (
		<Dialog open={open} onOpenChange={handleDismiss}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader className="text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
						<Bot className="h-6 w-6 text-primary" />
					</div>
					<DialogTitle className="text-xl">
						Add AI Chat to Your Website
					</DialogTitle>
					<DialogDescription className="text-muted-foreground">
						Let your customers chat with AI directly on your website. No coding
						required!
					</DialogDescription>
				</DialogHeader>

				<div className="my-4 rounded-lg bg-muted p-4">
					<h4 className="mb-2 font-semibold text-sm">What you can do:</h4>
					<ul className="space-y-2 text-muted-foreground text-sm">
						<li className="flex items-start gap-2">
							<span className="text-primary">✓</span>
							<span>Customize colors to match your brand</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-primary">✓</span>
							<span>Choose widget position (left or right)</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-primary">✓</span>
							<span>Get embed code in one click</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-primary">✓</span>
							<span>See live preview before deploying</span>
						</li>
					</ul>
				</div>

				<DialogFooter className="flex-col gap-3 sm:flex-col">
					<Button asChild className="w-full" onClick={handleSetUpNow}>
						<Link to="/dashboard/widget-setup">
							Set Up Now
							<ChevronRight className="ml-2 h-4 w-4" />
						</Link>
					</Button>

					<Button variant="outline" className="w-full" onClick={handleDismiss}>
						Remind Me Later
					</Button>

					<div className="flex items-center justify-center gap-2 pt-2">
						<Checkbox
							id="dont-show"
							checked={dontShowAgain}
							onCheckedChange={(checked) =>
								setDontShowAgain(checked as boolean)
							}
						/>
						<Label
							htmlFor="dont-show"
							className="cursor-pointer text-muted-foreground text-sm"
						>
							Don&apos;t show this again
						</Label>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
