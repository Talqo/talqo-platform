import { PageContainer } from "@/components/layout"
import { PageHeader } from "@/components/layout/PageHeader"
import { BlacklistManager } from "./BlacklistManager"
import { BotConfigForm } from "./BotConfigForm"

export function BotConfigPage() {
	return (
		<PageContainer>
			<PageHeader
				title="Bot Configuration"
				subtitle="Configure your bot's personality, behavior, and response rules."
			/>
			<BotConfigForm />
			<BlacklistManager />
		</PageContainer>
	)
}
