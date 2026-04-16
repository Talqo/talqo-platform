import { createFileRoute } from "@tanstack/react-router"
import { PageContainer } from "@/components/layout"
import { WidgetSetup } from "@/components/widget/WidgetSetup"

export const Route = createFileRoute("/_authenticated/dashboard/widget-setup")({
	component: WidgetSetupPage,
})

function WidgetSetupPage() {
	return (
		<PageContainer>
			<div className="mb-6">
				<h1 className="font-bold text-2xl text-foreground tracking-tight">
					Widget Setup
				</h1>
				<p className="text-muted-foreground">
					Customize your AI chatbot widget and get the embed code for your
					website.
				</p>
			</div>
			<WidgetSetup />
		</PageContainer>
	)
}
