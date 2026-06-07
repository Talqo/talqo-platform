import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { z } from "zod"
import { PageContainer } from "@/components/layout"
import { AccountSettingsTab, BillingSettingsTab } from "@/components/settings"
import { ProviderConfigTab } from "@/components/settings/ProviderConfigTab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TAB_VALUES = ["account", "billing", "ai-provider"] as const
type TabValue = (typeof TAB_VALUES)[number]

const searchSchema = z.object({
	tab: z.enum(TAB_VALUES).optional().catch("account"),
})

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
	validateSearch: searchSchema,
	component: SettingsPage,
})

function SettingsPage() {
	const { t } = useTranslation()
	const { tab } = Route.useSearch()
	const navigate = useNavigate({ from: Route.fullPath })

	const activeTab: TabValue = tab ?? "account"

	return (
		<PageContainer>
			<div>
				<h1 className="font-bold text-2xl text-foreground tracking-tight">
					{t("dashboard.settings.title")}
				</h1>
				<p className="text-muted-foreground">
					{t("dashboard.settings.subtitle")}
				</p>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(value) =>
					navigate({ search: { tab: value as TabValue } })
				}
				className="w-full"
			>
				<TabsList className="mb-4 flex-wrap gap-2">
					<TabsTrigger value="account">
						{t("dashboard.settings.accountTab")}
					</TabsTrigger>
					<TabsTrigger value="billing">
						{t("dashboard.settings.billingTab")}
					</TabsTrigger>
					<TabsTrigger value="ai-provider">
						{t("dashboard.settings.aiProviderTab")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="account">
					<AccountSettingsTab />
				</TabsContent>

				<TabsContent value="billing">
					<BillingSettingsTab />
				</TabsContent>

				<TabsContent value="ai-provider">
					<ProviderConfigTab />
				</TabsContent>
			</Tabs>
		</PageContainer>
	)
}
