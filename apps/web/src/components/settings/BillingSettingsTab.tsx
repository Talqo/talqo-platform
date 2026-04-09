import upgradeImage from "@/assets/Gemini_Generated_Image_7dq4tr7dq4tr7dq4.png";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function BillingSettingsTab() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Usage & Limits</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="monthly-limit">Monthly Limit (USD)</Label>
					<Input id="monthly-limit" type="number" defaultValue={50} />
				</div>
				<div className="flex items-center justify-between space-x-2 pt-2">
					<div>
						<Label htmlFor="usage-alerts">Usage Alerts</Label>
						<p className="text-muted-foreground text-sm">
							Email me when reaching 80% of limit
						</p>
					</div>
					<Switch id="usage-alerts" defaultChecked />
				</div>
			</CardContent>
			<CardFooter className="flex justify-between">
				<button
					type="button"
					className="relative h-16 overflow-hidden rounded-md border-2 border-primary transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
				>
					<img
						src={upgradeImage}
						alt="Upgrade plan"
						className="h-full w-auto object-contain"
					/>
				</button>
				<button
					type="submit"
					className="inline-flex items-center justify-center rounded-md border-2 border-primary bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:border-primary/80 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
				>
					Save Settings
				</button>
			</CardFooter>
		</Card>
	);
}
