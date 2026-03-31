import { createFileRoute } from "@tanstack/react-router";
import { BotContextPage } from "@/pages";

export const Route = createFileRoute("/dashboard/bot-context")({
	component: BotContextPage,
});
