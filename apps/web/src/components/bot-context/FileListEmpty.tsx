import { FileText } from "lucide-react"
import { useTranslation } from "react-i18next"

export function FileListEmpty() {
	const { t } = useTranslation()
	return (
		<div className="rounded-lg border-2 border-border border-dashed py-12 text-center text-muted-foreground">
			<FileText size={32} className="mx-auto mb-3 text-muted-foreground/50" />
			<p className="mb-1 font-medium">{t("botContext.fileListEmpty.title")}</p>
			<p className="text-sm">{t("botContext.fileListEmpty.description")}</p>
		</div>
	)
}
