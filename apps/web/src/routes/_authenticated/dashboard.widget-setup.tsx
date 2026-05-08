import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { PageContainer } from "@/components/layout"
import { WidgetSetup } from "@/components/widget/WidgetSetup"

export const Route = createFileRoute("/_authenticated/dashboard/widget-setup")({
	component: WidgetSetupPage,
})

function WidgetSetupPage() {
	const { t } = useTranslation()
	return (
		<PageContainer>
			<div className="mb-6">
				<h1 className="font-bold text-2xl text-foreground tracking-tight">
					{t("dashboard.widgetSetup.title")}
				</h1>
				<p className="text-muted-foreground">
					{t("dashboard.widgetSetup.subtitle")}
				</p>
			</div>
			<WidgetSetup />
		</PageContainer>
	)
}
