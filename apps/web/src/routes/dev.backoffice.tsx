import { createFileRoute } from "@tanstack/react-router";
import { BackOfficePage } from "@/pages";

export const Route = createFileRoute("/dev/backoffice")({
	component: BackOfficePage,
});
