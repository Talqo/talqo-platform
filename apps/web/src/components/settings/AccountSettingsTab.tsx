import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AccountSettingsTab() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Account Details</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="account-email">Email</Label>
					<Input id="account-email" defaultValue="admin@acme.com" />
				</div>
				<div className="space-y-2">
					<Label htmlFor="account-api-key">API Key</Label>
					<div className="flex gap-2">
						<Input
							id="account-api-key"
							type="password"
							placeholder="••••••••••••••••"
							readOnly
							className="flex-1"
						/>
						<Button variant="outline" size="sm">
							Copy
						</Button>
						<Button variant="outline" size="sm">
							Regenerate
						</Button>
					</div>
					<p className="text-muted-foreground text-sm">
						Use this key to authenticate API requests.
					</p>
				</div>
				<hr className="my-4 border-border border-t-2" />
				<div className="space-y-2">
					<Label htmlFor="current-password">Current Password</Label>
					<Input id="current-password" type="password" />
				</div>
				<div className="space-y-2">
					<Label htmlFor="new-password">New Password</Label>
					<Input id="new-password" type="password" />
				</div>
				<div className="space-y-2">
					<Label htmlFor="confirm-password">Confirm New Password</Label>
					<Input id="confirm-password" type="password" />
				</div>
			</CardContent>
			<CardFooter className="flex justify-end">
				<Button variant="default">Change Password</Button>
			</CardFooter>
		</Card>
	);
}
