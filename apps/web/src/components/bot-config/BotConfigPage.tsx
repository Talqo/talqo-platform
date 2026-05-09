import { useTranslation } from "react-i18next"
import { PageContainer } from "@/components/layout"
import { PageHeader } from "@/components/layout/PageHeader"
import { BlacklistManager } from "./BlacklistManager"
import { BotConfigForm } from "./BotConfigForm"

export function BotConfigPage() {
	const { t } = useTranslation()
	return (
		<PageContainer>
			<PageHeader
				title={t("botConfig.pageTitle")}
				subtitle={t("botConfig.pageSubtitle")}
			/>
			<BotConfigForm />
			<BlacklistManager />
		</PageContainer>
	)
}
