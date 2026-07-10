import { Link } from "@tanstack/react-router"
import { Bot, Moon, Sun } from "lucide-react"
import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/lib/useTheme"

export function LandingHeader() {
	const { theme, toggleTheme } = useTheme()
	const { t } = useTranslation()

	return (
		<header className="sticky top-0 z-50 border-border border-b bg-background/90 px-4 text-foreground shadow-sm backdrop-blur-xl sm:px-6">
			<div className="mx-auto flex h-16 max-w-7xl items-center">
				<Link to="/" className="flex flex-1 items-center gap-2">
					<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
						<Bot size={20} />
					</div>
					<span className="font-black text-lg tracking-tight">
						{t("common.talqo")}
					</span>
				</Link>
				<nav className="flex items-center gap-2 sm:gap-4">
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
						className="hidden font-semibold text-muted-foreground text-sm transition hover:text-foreground sm:inline-flex"
					>
						{t("auth.login.title")}
					</Link>
					<Button className="rounded-full px-4 font-bold sm:px-5" asChild>
						<Link to="/register">{t("landing.header.getStarted")}</Link>
					</Button>
				</nav>
			</div>
		</header>
	)
}
