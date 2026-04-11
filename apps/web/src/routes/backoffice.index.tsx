import { createFileRoute } from "@tanstack/react-router"
import { Building2, Loader2 } from "lucide-react"
import { useAdminClients } from "@/api/hooks/useAdmin"
import { BackOfficeStatCard } from "@/components/backoffice/BackOfficeStatCard"
import { TenantsTable } from "@/components/backoffice/TenantsTable"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

// Map API client response to Tenant format
function mapClientsToTenants(clients: unknown[]) {
	if (!clients || !Array.isArray(clients)) return []
	const ALLOWED_STATUSES = new Set(["active", "suspended"])
	return clients.map(
		(client: { id: string; name: string; email: string; status?: string }) => ({
			id: client.id,
			name: client.name || client.email, // Fallback to email if no name
			status: ALLOWED_STATUSES.has(client.status)
				? (client.status as "active" | "suspended")
				: "active",
			apiType: "Platform Default",
			tokenUsage: "N/A",
		}),
	)
}

export const Route = createFileRoute("/backoffice/")({
	component: BackofficePage,
})

function BackofficePage() {
	const { data: clients, isLoading, error } = useAdminClients({ limit: 50 })

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

			{/* Stats Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<BackOfficeStatCard
					title="Total Tenants"
					value={clients?.length?.toString() ?? "0"}
					subtitle="Active tenants"
					icon={Building2}
				/>
			</div>

			{/* Tenants Table */}
			<Card>
				<CardHeader>
					<CardTitle>Tenants</CardTitle>
					<CardDescription>Manage all tenants in the system</CardDescription>
				</CardHeader>
				<CardContent>
					<TenantsTable tenants={mapClientsToTenants(clients)} />
				</CardContent>
			</Card>
		</div>
	)
}
