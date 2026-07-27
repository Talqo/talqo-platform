import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/account")({
	component: AccountPage,
});

function AccountPage() {
	return (
		<div className="space-y-4">
			<h1 className="font-bold text-2xl text-foreground">Account</h1>
			<p className="text-muted-foreground">
				Manage your account settings and preferences here.
			</p>
		</div>
	);
}
