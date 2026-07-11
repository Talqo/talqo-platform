import { Link } from "@tanstack/react-router"
import { Bot, Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher"
import { MotifSwitcher } from "@/components/common/MotifSwitcher"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/lib/useTheme"

export function LandingHeader() {
	const { theme, toggleTheme } = useTheme()
	const { t } = useTranslation()

	return (
		<header className="sticky top-0 z-50 flex h-16 items-center border-border border-b bg-background px-6">
			<div className="flex flex-1 items-center gap-2">
				<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<Bot size={20} />
				</div>
				<span className="font-semibold text-card-foreground">PagePal</span>
			</div>
			<nav className="flex items-center gap-4">
				<MotifSwitcher />
				<Button
					variant="ghost"
					size="icon"
					onClick={toggleTheme}
					aria-label={
						theme === "dark"
							? t("landing.header.switchToLightTheme")
							: t("landing.header.switchToDarkTheme")
					}
				>
					{theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
				</Button>
				<LanguageSwitcher />
				<Link
					to="/login"
					className="font-medium text-muted-foreground text-sm hover:text-foreground"
				>
					{t("auth.login.title")}
				</Link>
				<Button asChild>
					<Link to="/register">{t("landing.header.getStarted")}</Link>
				</Button>
			</nav>
		</header>
	)
}
