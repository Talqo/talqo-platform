import { createFileRoute } from "@tanstack/react-router";
import { BotConfigPage } from "@/pages";

export const Route = createFileRoute("/dashboard/bot-config")({
	component: BotConfigPage,
});
