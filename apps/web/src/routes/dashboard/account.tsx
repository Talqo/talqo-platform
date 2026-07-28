import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOperator } from "./-account-query";
import { PageHeader } from "./-page-header";

export const Route = createFileRoute("/dashboard/account")({
	component: AccountPage,
});

function AccountPage() {
	const { data: operator, isLoading } = useOperator();
	const [profileSaved, setProfileSaved] = useState(false);
	const [passwordError, setPasswordError] = useState("");
	const [passwordChanged, setPasswordChanged] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deleteConfirmed, setDeleteConfirmed] = useState(false);

	function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setProfileSaved(true);
	}

	function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const form = new FormData(event.currentTarget);
		const newPassword = String(form.get("newPassword") ?? "");
		const confirmPassword = String(form.get("confirmPassword") ?? "");
		if (newPassword !== confirmPassword) {
			setPasswordError("New passwords do not match.");
			setPasswordChanged(false);
			return;
		}
		setPasswordError("");
		setPasswordChanged(true);
		event.currentTarget.reset();
	}

	function handleDeleteConfirm() {
		setDeleteOpen(false);
		setDeleteConfirmed(true);
	}

	if (isLoading || !operator) {
		return (
			<div className="mx-auto max-w-3xl">
				<p className="text-muted-foreground">Loading account…</p>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<PageHeader
				title="Account"
				description="Manage your account settings and preferences."
			/>

			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
					<CardDescription>Your operator name and email.</CardDescription>
				</CardHeader>
				<form onSubmit={handleProfileSubmit}>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="account-name">Name</Label>
							<Input
								id="account-name"
								name="name"
								defaultValue={operator.name}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="account-email">Email</Label>
							<Input
								id="account-email"
								name="email"
								type="email"
								defaultValue={operator.email}
								required
							/>
						</div>
						{profileSaved && (
							<p className="text-muted-foreground text-sm" role="status">
								Profile changes will be persisted in a later iteration.
							</p>
						)}
					</CardContent>
					<CardFooter>
						<Button type="submit">Save profile</Button>
					</CardFooter>
				</form>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Change password</CardTitle>
					<CardDescription>
						Use a strong password you do not reuse elsewhere.
					</CardDescription>
				</CardHeader>
				<form onSubmit={handlePasswordSubmit}>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="current-password">Current password</Label>
							<Input
								id="current-password"
								name="currentPassword"
								type="password"
								autoComplete="current-password"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="new-password">New password</Label>
							<Input
								id="new-password"
								name="newPassword"
								type="password"
								autoComplete="new-password"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="confirm-password">Confirm new password</Label>
							<Input
								id="confirm-password"
								name="confirmPassword"
								type="password"
								autoComplete="new-password"
								aria-describedby={passwordError ? "password-error" : undefined}
								required
							/>
						</div>
						{passwordError && (
							<p id="password-error" className="text-destructive text-sm">
								{passwordError}
							</p>
						)}
						{passwordChanged && (
							<p className="text-muted-foreground text-sm" role="status">
								Password changes will be persisted in a later iteration.
							</p>
						)}
					</CardContent>
					<CardFooter>
						<Button type="submit">Change password</Button>
					</CardFooter>
				</form>
			</Card>

			<Card className="border-destructive">
				<CardHeader>
					<CardTitle>Danger zone</CardTitle>
					<CardDescription>
						Deleting your account removes all bots and analytics data.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
						<DialogTrigger asChild>
							<Button variant="destructive">Delete account</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>Delete account</DialogTitle>
								<DialogDescription>
									This action cannot be undone. All bots, widget configurations,
									and analytics data will be permanently removed.
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<Button variant="outline" onClick={() => setDeleteOpen(false)}>
									Cancel
								</Button>
								<Button variant="destructive" onClick={handleDeleteConfirm}>
									Delete account
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
					{deleteConfirmed && (
						<p className="mt-2 text-muted-foreground text-sm" role="status">
							Account deletion will be implemented in a later iteration.
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
