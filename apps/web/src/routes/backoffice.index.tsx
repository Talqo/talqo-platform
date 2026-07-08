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
import { ClientsTable } from "@/components/backoffice/ClientsTable"
import type { ClientEntry } from "@/components/backoffice/types"
import { QuestionsAskedChart, TokenConsumptionChart } from "@/components/charts"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { useBackofficeChartData } from "@/hooks/useBackofficeChartData"
import { AUTH } from "@/lib/constants"

type Client = {
	id: string
	name: string
	email: string
	balanceUsd: string
	status: string
	lastActive: string | null
	createdAt: string
	totalTokens: number
	aiProvider: string | null
}

const PROVIDER_LABELS: Record<string, string> = {
	openai: "provider.openai",
	openai_compatible: "provider.openaiCompatible",
	google: "provider.google",
	anthropic: "provider.anthropic",
}

function mapToClientEntries(
	clients: Client[],
	t: (key: string) => string,
): ClientEntry[] {
	const ALLOWED_STATUSES = new Set(["active", "suspended"])
	return clients.map((client) => ({
		id: client.id,
		name: client.name || client.email,
		status:
			client.status && ALLOWED_STATUSES.has(client.status)
				? (client.status as "active" | "suspended")
				: "active",
		aiProvider: client.aiProvider
			? PROVIDER_LABELS[client.aiProvider]
				? t(PROVIDER_LABELS[client.aiProvider])
				: client.aiProvider
			: t("backoffice.clientsTable.platformDefault"),
		tokenUsage: client.totalTokens.toLocaleString(),
	}))
}

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
	const [impersonateError, setImpersonateError] = useState<string | null>(null)
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
		setImpersonateError(null)
		impersonate.mutate(id, {
			onSuccess: ({ token }) => {
				localStorage.setItem(AUTH.TOKEN_KEY, token)
				qc.clear()
				navigate({ to: "/dashboard" })
			},
			onError: (err) => {
				setImpersonateError(
					err.error?.message ??
						"Failed to impersonate client. Please try again.",
				)
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
					title={t("backoffice.stats.totalClients")}
					value={clients?.length?.toString() ?? "0"}
					subtitle={t("backoffice.stats.allClients")}
					icon={Building2}
				/>
				<BackOfficeStatCard
					title={t("backoffice.stats.activeClientsLast30d")}
					value={stats?.activeClientsLast30Days?.toString() ?? "—"}
					subtitle={t("backoffice.stats.activeClientsLast30dSubtitle")}
					icon={Users}
				/>

				<BackOfficeStatCard
					title={t("backoffice.stats.conversations")}
					value={stats?.totalConversations?.toString() ?? "—"}
					subtitle={t("backoffice.stats.allTime")}
					icon={MessageSquare}
				/>
				<BackOfficeStatCard
					title={t("backoffice.stats.avgSatisfaction")}
					value={
						stats?.avgSatisfactionRating != null
							? `${Number(stats.avgSatisfactionRating).toFixed(1)} / 5`
							: "—"
					}
					subtitle={t("backoffice.stats.platformWideRating")}
					icon={Star}
				/>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
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
					<CardTitle>{t("backoffice.stats.clients")}</CardTitle>
					<CardDescription>
						{t("backoffice.stats.manageClients")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{impersonateError && (
						<Alert variant="destructive" className="mb-4">
							<AlertDescription>{impersonateError}</AlertDescription>
						</Alert>
					)}
					<ClientsTable
						clients={clients ? mapToClientEntries(clients, t) : []}
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
						? t("backoffice.clientActions.suspendTitle")
						: t("backoffice.clientActions.reEnableTitle")
				}
				description={
					dialogType === "suspend"
						? t("backoffice.clientActions.suspendDescription")
						: t("backoffice.clientActions.reEnableDescription")
				}
				confirmLabel={
					dialogType === "suspend"
						? t("backoffice.clientsTable.suspend")
						: t("backoffice.clientsTable.reEnable")
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
