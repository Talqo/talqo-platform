import { Globe } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { STORAGE_KEYS } from "@/lib/constants"

const LANGUAGES = [
	{ code: "en", label: "english" },
	{ code: "cs", label: "czech" },
	{ code: "zh", label: "chinese" },
]

export function LanguageSwitcher() {
	const { i18n, t } = useTranslation()

	const changeLanguage = (lng: string) => {
		i18n.changeLanguage(lng)
		localStorage.setItem(STORAGE_KEYS.LANG, lng)
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="gap-1">
					<Globe size={16} />
					<span className="uppercase">{i18n.language}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{LANGUAGES.map((lang) => (
					<DropdownMenuItem
						key={lang.code}
						onClick={() => changeLanguage(lang.code)}
						className={i18n.language === lang.code ? "bg-accent" : ""}
					>
						{t(lang.label)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
