import { createFileRoute } from "@tanstack/react-router"
import { Building2, Users } from "lucide-react"
import { BackOfficeStatCard } from "@/components/backoffice/BackOfficeStatCard"
import { TenantsTable } from "@/components/backoffice/TenantsTable"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

export const Route = createFileRoute("/backoffice/")({
	component: BackofficePage,
})

function BackofficePage() {
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
					value="24"
					description="Active tenants"
					icon={Building2}
				/>
				<BackOfficeStatCard
					title="Total Users"
					value="156"
					description="Across all tenants"
					icon={Users}
				/>
			</div>

			{/* Tenants Table */}
			<Card>
				<CardHeader>
					<CardTitle>Tenants</CardTitle>
					<CardDescription>Manage all tenants in the system</CardDescription>
				</CardHeader>
				<CardContent>
					<TenantsTable />
				</CardContent>
			</Card>
		</div>
	)
}
