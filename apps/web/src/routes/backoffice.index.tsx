import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
	BarChart3,
	Building2,
	DollarSign,
	Loader2,
	MessageSquare,
	Star,
	Users,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
	useAdminAnalyticsSummary,
	useAdminClients,
	useAdminConversationAnalytics,
	useAdminTokenAnalytics,
	useImpersonateClient,
	useUpdateClientStatus,
} from "@/api/hooks/useAdmin"
import { BackOfficeStatCard } from "@/components/backoffice/BackOfficeStatCard"
import { TenantsTable } from "@/components/backoffice/TenantsTable"
import { QuestionsAskedChart, TokenConsumptionChart } from "@/components/charts"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { useBackofficeChartData } from "@/hooks/useBackofficeChartData"
import { mapClientsToTenants } from "@/lib/backoffice-utils"
import { AUTH } from "@/lib/constants"

export const Route = createFileRoute("/backoffice/")({
	component: BackofficePage,
})

function BackofficePage() {
	const navigate = useNavigate()
	const qc = useQueryClient()
	const { t } = useTranslation()
	const { data: clients, isLoading, error } = useAdminClients({ limit: 50 })
	const { data: stats } = useAdminAnalyticsSummary()
	const { data: tokenData } = useAdminTokenAnalytics()
	const { data: conversationData } = useAdminConversationAnalytics()
	const updateStatus = useUpdateClientStatus()
	const impersonate = useImpersonateClient()
	const [pendingId, setPendingId] = useState<string | undefined>()
	const [confirmAction, setConfirmAction] = useState<{
		id: string
		type: "suspend" | "reenable"
	} | null>(null)
	const [actionError, setActionError] = useState<string | null>(null)
	// Snapshot of the action type used for dialog labels — persists through the
	// close animation so labels don't flip when confirmAction is cleared.
	const [dialogType, setDialogType] = useState<"suspend" | "reenable">(
		"suspend",
	)

	const { tokenChartData, conversationChartData } = useBackofficeChartData(
		tokenData,
		conversationData,
	)

	function handleSuspend(id: string) {
		setDialogType("suspend")
		setActionError(null)
		setConfirmAction({ id, type: "suspend" })
	}

	function handleReEnable(id: string) {
		setDialogType("reenable")
		setActionError(null)
		setConfirmAction({ id, type: "reenable" })
	}

	function handleConfirm() {
		if (!confirmAction) return
		const { id, type } = confirmAction
		setPendingId(id)
		setActionError(null)
		updateStatus.mutate(
			{ clientId: id, status: type === "suspend" ? "suspended" : "active" },
			{
				onSettled: () => setPendingId(undefined),
				onSuccess: () => setConfirmAction(null),
				onError: (err) => {
					setActionError(
						err.error?.message ??
							"Failed to update client status. Please try again.",
					)
				},
			},
		)
	}

	function handleImpersonate(id: string) {
		setPendingId(id)
		impersonate.mutate(id, {
			onSuccess: ({ token }) => {
				localStorage.setItem(AUTH.TOKEN_KEY, token)
				qc.clear()
				navigate({ to: "/dashboard" })
			},
			onSettled: () => setPendingId(undefined),
		})
	}

	if (isLoading) {
		return (
			<div className="flex min-h-[300px] flex-1 items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex min-h-[300px] flex-1 items-center justify-center">
				<p className="text-muted-foreground">
					{t("backoffice.stats.failedToLoadClients")}
				</p>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-3xl tracking-tight">
					{t("backoffice.stats.adminDashboard")}
				</h1>
				<p className="text-muted-foreground">
					{t("backoffice.stats.adminDashboardDescription")}
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<BackOfficeStatCard
					title={t("backoffice.stats.totalTenants")}
					value={clients?.length?.toString() ?? "0"}
					subtitle={t("backoffice.stats.registeredTenants")}
					icon={Building2}
				/>
				<BackOfficeStatCard
					title={t("backoffice.stats.activeClients")}
					value={stats?.activeClients?.toString() ?? "—"}
					subtitle={t("backoffice.stats.currentlyActive")}
					icon={Building2}
				/>
				<BackOfficeStatCard
					title={t("backoffice.stats.platformTokens")}
					value={
						stats?.totalTokens != null
							? Number(stats.totalTokens).toLocaleString()
							: "—"
					}
					subtitle={t("backoffice.stats.totalConsumed")}
					icon={BarChart3}
				/>
				<BackOfficeStatCard
					title={t("backoffice.stats.totalCost")}
					value={(() => {
						const cost = Number(stats?.totalCostUsd)
						return Number.isFinite(cost) ? `$${cost.toFixed(2)}` : "—"
					})()}
					subtitle={t("backoffice.stats.platformSpend")}
					icon={DollarSign}
				/>
				<BackOfficeStatCard
					title={t("backoffice.stats.conversations")}
					value={stats?.totalConversations?.toString() ?? "—"}
					subtitle={t("backoffice.stats.allTime")}
					icon={MessageSquare}
				/>
				<BackOfficeStatCard
					title="Active Tenants (30d)"
					value={stats?.activeTenantsLast30Days?.toString() ?? "—"}
					subtitle="With conversations in last 30 days"
					icon={Users}
				/>
				<BackOfficeStatCard
					title="Avg Satisfaction"
					value={
						stats?.avgSatisfactionRating != null
							? `${Number(stats.avgSatisfactionRating).toFixed(1)} / 5`
							: "No data"
					}
					subtitle="Platform-wide rating"
					icon={Star}
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<TokenConsumptionChart data={tokenChartData} />
				<QuestionsAskedChart
					data={conversationChartData}
					title={t("charts.conversations.title")}
					description={t("charts.conversations.description")}
					ariaLabel={t("charts.conversations.ariaLabel")}
				/>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t("backoffice.stats.tenants")}</CardTitle>
					<CardDescription>
						{t("backoffice.stats.manageTenants")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<TenantsTable
						tenants={
							clients
								? mapClientsToTenants(
										clients,
										t("backoffice.tenantsTable.platformDefault"),
									)
								: []
						}
						onSuspend={handleSuspend}
						onReEnable={handleReEnable}
						onImpersonate={handleImpersonate}
						pendingId={pendingId}
					/>
				</CardContent>
			</Card>

			<ConfirmDialog
				open={confirmAction !== null}
				onOpenChange={(open) => {
					if (!open) setConfirmAction(null)
				}}
				title={
					dialogType === "suspend"
						? t("backoffice.client.suspendTitle")
						: t("backoffice.client.reEnableTitle")
				}
				description={
					dialogType === "suspend"
						? t("backoffice.client.suspendDescription")
						: t("backoffice.client.reEnableDescription")
				}
				confirmLabel={
					dialogType === "suspend"
						? t("backoffice.client.suspendConfirm")
						: t("backoffice.client.reEnableConfirm")
				}
				cancelLabel={t("common.cancel")}
				variant="destructive"
				onConfirm={handleConfirm}
				confirmLoading={updateStatus.isPending}
				error={actionError}
			/>
		</div>
	)
}
