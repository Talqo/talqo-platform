import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

export function HeroSection() {
	const { t } = useTranslation()

	return (
		<section className="container mx-auto px-6 py-24 text-center sm:py-32">
			<h1 className="font-bold text-4xl text-foreground tracking-tight sm:text-6xl">
				{t("landing.heroSection.line1")} <br className="hidden sm:inline" />
				{t("landing.heroSection.line2")}
			</h1>
			<p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-8">
				{t("landing.heroSection.description")}
			</p>
			<div className="mt-10 flex items-center justify-center gap-x-6">
				<Button size="lg" asChild>
					<Link to="/register">{t("landing.heroSection.startForFree")}</Link>
				</Button>
				<Button variant="outline-primary" size="lg" asChild>
					<a
						href="https://github.com/talqo/talqo-platform/tree/main/docs"
						target="_blank"
						rel="noopener noreferrer"
					>
						{t("landing.heroSection.viewDocumentation")}
					</a>
				</Button>
			</div>
		</section>
	)
}
