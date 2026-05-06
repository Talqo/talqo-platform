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
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import type { Tenant } from "@/data/backoffice"
import type { ChartDataPoint } from "@/data/charts"
import { AUTH } from "@/lib/constants"

function formatPeriod(period: string): string {
	return new Date(period).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	})
}

type Client = {
	id: string
	name: string
	email: string
	balanceUsd: string
	status: string
	lastActive: string | null
	createdAt: string
}

function mapClientsToTenants(clients: Client[]): Tenant[] {
	const ALLOWED_STATUSES = new Set(["active", "suspended"])
	return clients.map((client) => ({
		id: client.id,
		name: client.name || client.email,
		status:
			client.status && ALLOWED_STATUSES.has(client.status)
				? (client.status as "active" | "suspended")
				: "active",
		apiType: "Platform Default",
		tokenUsage: "N/A",
	}))
}

export const Route = createFileRoute("/backoffice/")({
	component: BackofficePage,
})

function BackofficePage() {
	const navigate = useNavigate()
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

	const tokenChartData: ChartDataPoint[] = (tokenData ?? []).map((d) => ({
		name: formatPeriod(d.period),
		tokens: d.tokensUsed,
		questions: 0,
	}))

	const conversationChartData: ChartDataPoint[] = (conversationData ?? []).map(
		(d) => ({
			name: formatPeriod(d.period),
			tokens: 0,
			questions: d.conversationCount,
		}),
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
				<p className="text-muted-foreground">Failed to load clients</p>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-3xl tracking-tight">Admin Dashboard</h1>
				<p className="text-muted-foreground">
					Manage tenants, users, and system settings
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<BackOfficeStatCard
					title="Total Tenants"
					value={clients?.length?.toString() ?? "0"}
					subtitle="Registered tenants"
					icon={Building2}
				/>
				<BackOfficeStatCard
					title="Active Clients"
					value={stats?.activeClients?.toString() ?? "—"}
					subtitle="Currently active"
					icon={Building2}
				/>
				<BackOfficeStatCard
					title="Platform Tokens"
					value={
						stats?.totalTokens != null
							? Number(stats.totalTokens).toLocaleString()
							: "—"
					}
					subtitle="Total consumed"
					icon={BarChart3}
				/>
				<BackOfficeStatCard
					title="Total Cost"
					value={(() => {
						const cost = Number(stats?.totalCostUsd)
						return Number.isFinite(cost) ? `$${cost.toFixed(2)}` : "—"
					})()}
					subtitle="Platform spend"
					icon={DollarSign}
				/>
				<BackOfficeStatCard
					title="Conversations"
					value={stats?.totalConversations?.toString() ?? "—"}
					subtitle="All time"
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
				<QuestionsAskedChart data={conversationChartData} />
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Tenants</CardTitle>
					<CardDescription>Manage all tenants in the system</CardDescription>
				</CardHeader>
				<CardContent>
					<TenantsTable
						tenants={clients ? mapClientsToTenants(clients) : []}
						onSuspend={handleSuspend}
						onReEnable={handleReEnable}
						onImpersonate={handleImpersonate}
						pendingId={pendingId}
					/>
				</CardContent>
			</Card>

			<AlertDialog
				open={confirmAction !== null}
				onOpenChange={(open) => {
					if (!open) setConfirmAction(null)
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{dialogType === "suspend"
								? "Suspend client?"
								: "Re-enable client?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{dialogType === "suspend"
								? "This will immediately block the client from accessing their dashboard and widget."
								: "This will restore the client's access to their dashboard and widget."}
						</AlertDialogDescription>
						{actionError && (
							<Alert variant="destructive" className="mt-4">
								<AlertDescription>{actionError}</AlertDescription>
							</Alert>
						)}
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={updateStatus.isPending}>
							Cancel
						</AlertDialogCancel>
						<Button onClick={handleConfirm} disabled={updateStatus.isPending}>
							{dialogType === "suspend" ? "Suspend" : "Re-enable"}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
