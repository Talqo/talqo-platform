import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/pages";

export const Route = createFileRoute("/dashboard/")({
	component: AdminDashboard,
});
