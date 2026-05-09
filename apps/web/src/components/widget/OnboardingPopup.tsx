import { Link } from "@tanstack/react-router"
import { Bot, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useDismissWidgetSetup } from "@/api/hooks"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"

type OnboardingPopupProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function OnboardingPopup({ open, onOpenChange }: OnboardingPopupProps) {
	const { t } = useTranslation()
	const dismissMutation = useDismissWidgetSetup()

	const handleDismiss = () => {
		onOpenChange(false)
	}

	const handleSetUpNow = () => {
		onOpenChange(false)
	}

	const handleDontShowAgain = async () => {
		try {
			await dismissMutation.mutateAsync()
		} catch (err) {
			console.error("Failed to dismiss widget setup:", err)
		} finally {
			onOpenChange(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleDismiss}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader className="text-center">
					<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
						<Bot className="h-6 w-6 text-primary" />
					</div>
					<DialogTitle className="text-xl">
						{t("widget.onboarding.title")}
					</DialogTitle>
					<DialogDescription className="text-muted-foreground">
						{t("widget.onboarding.description")}
					</DialogDescription>
				</DialogHeader>

				<div className="my-4 rounded-lg bg-muted p-4">
					<h4 className="mb-2 font-semibold text-sm">
						{t("widget.onboarding.whatYouCanDo")}
					</h4>
					<ul className="space-y-2 text-muted-foreground text-sm">
						<li className="flex items-start gap-2">
							<span className="text-primary">✓</span>
							<span>{t("widget.onboarding.customizeColors")}</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-primary">✓</span>
							<span>{t("widget.onboarding.choosePosition")}</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-primary">✓</span>
							<span>{t("widget.onboarding.getEmbedCode")}</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="text-primary">✓</span>
							<span>{t("widget.onboarding.seePreview")}</span>
						</li>
					</ul>
				</div>

				<DialogFooter className="flex-col gap-3 sm:flex-col">
					<Button asChild className="w-full" onClick={handleSetUpNow}>
						<Link to="/dashboard/widget-setup">
							{t("widget.onboarding.setUpNow")}
							<ChevronRight className="ml-2 h-4 w-4" />
						</Link>
					</Button>

					<Button variant="outline" className="w-full" onClick={handleDismiss}>
						{t("widget.onboarding.remindLater")}
					</Button>

					<Button
						variant="ghost"
						className="w-full text-muted-foreground"
						onClick={handleDontShowAgain}
						disabled={dismissMutation.isPending}
					>
						{dismissMutation.isPending
							? t("widget.onboarding.saving")
							: t("widget.onboarding.dontShowAgain")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
