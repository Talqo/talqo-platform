import { createFileRoute } from "@tanstack/react-router"
import { BotConfigPage } from "@/components/bot-config"

export const Route = createFileRoute("/_authenticated/dashboard/bot-config")({
	component: BotConfigPage,
})
