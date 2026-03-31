import { PageContainer } from "@/components/layout";
import { AccountSettingsTab, BillingSettingsTab } from "@/components/settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SettingsPage() {
	return (
		<PageContainer>
			<div>
				<h2 className="font-bold text-2xl text-foreground tracking-tight">
					Settings
				</h2>
				<p className="text-muted-foreground">
					Manage your account settings and billing information.
				</p>
			</div>

			<Tabs defaultValue="account" className="w-full">
				<TabsList className="mb-4 flex-wrap gap-2">
					<TabsTrigger value="account">Account</TabsTrigger>
					<TabsTrigger value="billing">Usage & Billing</TabsTrigger>
				</TabsList>

				<TabsContent value="account">
					<AccountSettingsTab />
				</TabsContent>

				<TabsContent value="billing">
					<BillingSettingsTab />
				</TabsContent>
			</Tabs>
		</PageContainer>
	);
}
