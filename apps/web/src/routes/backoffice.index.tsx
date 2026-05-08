import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
	BarChart3,
	Building2,
	DollarSign,
	Loader2,
	MessageSquare,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
	useAdminClients,
	useAdminPlatformStats,
	useImpersonateClient,
	useUpdateClientStatus,
} from "@/api/hooks/useAdmin"
import { BackOfficeStatCard } from "@/components/backoffice/BackOfficeStatCard"
import { TenantsTable } from "@/components/backoffice/TenantsTable"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import type { Tenant } from "@/data/backoffice"
import { AUTH } from "@/lib/constants"

type Client = {
	id: string
	name: string
	email: string
	balanceUsd: string
	status: string
	lastActive: string | null
	createdAt: string
}

function mapClientsToTenants(
	clients: Client[],
	t: (key: string) => string,
): Tenant[] {
	const ALLOWED_STATUSES = new Set(["active", "suspended"])
	return clients.map((client) => ({
		id: client.id,
		name: client.name || client.email,
		status:
			client.status && ALLOWED_STATUSES.has(client.status)
				? (client.status as "active" | "suspended")
				: "active",
		apiType: t("backoffice.tenantsTable.platformDefault"),
		tokenUsage: "N/A",
	}))
}

export const Route = createFileRoute("/backoffice/")({
	component: BackofficePage,
})

function BackofficePage() {
	const navigate = useNavigate()
	const { t } = useTranslation()
	const { data: clients, isLoading, error } = useAdminClients({ limit: 50 })
	const { data: stats } = useAdminPlatformStats()
	const updateStatus = useUpdateClientStatus()
	const impersonate = useImpersonateClient()
	const [pendingId, setPendingId] = useState<string | undefined>()

	function handleSuspend(id: string) {
		setPendingId(id)
		updateStatus.mutate(
			{ clientId: id, status: "suspended" },
			{ onSettled: () => setPendingId(undefined) },
		)
	}

	function handleReEnable(id: string) {
		setPendingId(id)
		updateStatus.mutate(
			{ clientId: id, status: "active" },
			{ onSettled: () => setPendingId(undefined) },
		)
	}

	function handleImpersonate(id: string) {
		setPendingId(id)
		impersonate.mutate(id, {
			onSuccess: ({ token }) => {
				localStorage.setItem(AUTH.TOKEN_KEY, token)
				navigate({ to: "/dashboard" })
			},
			onSettled: () => setPendingId(undefined),
		})
	}

	if (isLoading) {
		return (
			<div className="flex h-[400px] items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		)
	}

	if (error) {
		return (
			<div className="flex h-[400px] items-center justify-center">
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
						tenants={clients ? mapClientsToTenants(clients, t) : []}
						onSuspend={handleSuspend}
						onReEnable={handleReEnable}
						onImpersonate={handleImpersonate}
						pendingId={pendingId}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
