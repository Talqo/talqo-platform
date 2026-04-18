import { createFileRoute } from "@tanstack/react-router"
import { AddFundsForm } from "@/components/billing"
import { PageHeader } from "@/components/layout"

export const Route = createFileRoute("/_authenticated/dashboard/add-funds")({
	component: AddFundsPage,
})

function AddFundsPage() {
	return (
		<div className="space-y-6">
			<PageHeader title="Add Funds" subtitle="Top up your account balance." />
			<AddFundsForm />
		</div>
	)
}
