import { PageContainer } from "@/components/layout";
import {
	AccountSettingsTab,
	BillingSettingsTab,
	BotSettingsTab,
	ToolsTab,
} from "@/components/settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SettingsPage() {
	return (
		<PageContainer>
			<div>
				<h2 className="font-bold text-2xl text-foreground tracking-tight">
					Settings
				</h2>
				<p className="text-muted-foreground">
					Manage your bot&apos;s behavior, integrations, and billing.
				</p>
			</div>

			<Tabs defaultValue="bot" className="w-full">
				<TabsList className="mb-4 flex-wrap gap-2">
					<TabsTrigger value="account">Account</TabsTrigger>
					<TabsTrigger value="bot">Bot Configuration</TabsTrigger>
					<TabsTrigger value="tools">Tools (MCP)</TabsTrigger>
					<TabsTrigger value="billing">Usage & Billing</TabsTrigger>
				</TabsList>

				<TabsContent value="account">
					<AccountSettingsTab />
				</TabsContent>

				<TabsContent value="bot">
					<BotSettingsTab />
				</TabsContent>

				<TabsContent value="tools">
					<ToolsTab />
				</TabsContent>

				<TabsContent value="billing">
					<BillingSettingsTab />
				</TabsContent>
			</Tabs>
		</PageContainer>
	);
}
