import { createFileRoute } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { AddFundsForm } from "@/components/billing"
import { PageHeader } from "@/components/layout"

export const Route = createFileRoute("/_authenticated/dashboard/add-funds")({
	component: AddFundsPage,
})

function AddFundsPage() {
	const { t } = useTranslation()
	return (
		<div className="space-y-6">
			<PageHeader
				title={t("dashboard.addFunds.title")}
				subtitle={t("dashboard.addFunds.subtitle")}
			/>
			<AddFundsForm />
		</div>
	)
}
