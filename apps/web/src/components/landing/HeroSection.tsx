import { Link } from "@tanstack/react-router"
import { Bot, CornerDownRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { getEmbedCodeLines } from "@/data/landing"

const getWidgetBundleUrl = () => {
	if (import.meta.env.VITE_WIDGET_BUNDLE_URL) {
		return import.meta.env.VITE_WIDGET_BUNDLE_URL
	}

	if (import.meta.env.DEV) {
		return "http://localhost:5174/widget-bundle.js"
	}

	return `${window.location.origin}/widget-bundle.js`
}

export function HeroSection() {
	const { t } = useTranslation()
	const embedCodeLines = getEmbedCodeLines(getWidgetBundleUrl())

	return (
		<section className="relative isolate overflow-hidden bg-background px-6 pt-16 pb-20 text-foreground sm:pt-24 sm:pb-28">
			<div
				className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_12%,var(--secondary),transparent_32%),radial-gradient(circle_at_85%_18%,var(--accent),transparent_28%)] opacity-70"
				aria-hidden="true"
			/>
			<div
				className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-size-[44px_44px] opacity-[0.08]"
				aria-hidden="true"
			/>

			<div className="container mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
				<div className="max-w-3xl text-left">
					<h1 className="max-w-4xl text-balance font-black text-5xl text-foreground tracking-[-0.06em] sm:text-7xl lg:text-8xl">
						{t("landing.heroSection.line1")}{" "}
						<span className="text-primary">
							{t("landing.heroSection.line2")}
						</span>
					</h1>
					<p className="mt-7 max-w-2xl text-lg text-muted-foreground leading-8 sm:text-xl">
						{t("landing.heroSection.description")}
					</p>

					<div className="mt-10 flex flex-col gap-3 sm:flex-row">
						<Button
							size="lg"
							className="h-12 rounded-full px-7 font-bold"
							asChild
						>
							<Link to="/register">
								{t("landing.heroSection.startForFree")}
							</Link>
						</Button>
						<Button
							variant="outline-primary"
							size="lg"
							className="h-12 rounded-full px-7 font-bold"
							asChild
						>
							<a
								href="https://github.com/talqo/talqo-platform/tree/main/docs"
								target="_blank"
								rel="noopener noreferrer"
							>
								{t("landing.heroSection.viewDocumentation")}
							</a>
						</Button>
					</div>
				</div>

				<div className="relative mx-auto w-full max-w-2xl lg:mr-0">
					<div className="relative rounded-4xl border border-border bg-card p-3 shadow-2xl shadow-primary/10">
						<div className="rounded-[1.45rem] border border-border bg-background p-4">
							<div className="mb-4 flex items-center justify-between text-muted-foreground text-xs">
								<div className="flex gap-1.5" aria-hidden="true">
									<span className="h-2.5 w-2.5 rounded-full bg-destructive" />
									<span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
									<span className="h-2.5 w-2.5 rounded-full bg-primary" />
								</div>
								<span>{t("landing.heroSection.embedFile")}</span>
							</div>

							<pre className="overflow-x-auto rounded-2xl border border-border bg-muted p-4 text-left text-muted-foreground text-sm leading-7 shadow-inner">
								<code>
									{embedCodeLines.map((line, index) => (
										<span
											className={index === 1 ? "block text-primary" : "block"}
											key={line}
										>
											{line}
										</span>
									))}
								</code>
							</pre>

							<div className="relative mt-5 overflow-hidden rounded-3xl border border-border bg-card p-4 text-card-foreground">
								<div className="mb-4 flex items-center justify-between border-border border-b pb-3 text-xs">
									<span className="font-bold uppercase tracking-[0.22em]">
										{t("landing.heroSection.previewSite")}
									</span>
									<span className="rounded-full bg-primary px-2 py-1 font-semibold text-primary-foreground">
										{t("landing.heroSection.live")}
									</span>
								</div>
								<div className="grid gap-3 sm:grid-cols-[1fr_0.68fr]">
									<div className="space-y-3">
										<div className="h-16 rounded-2xl bg-foreground" />
										<div className="grid grid-cols-3 gap-2">
											<div className="h-20 rounded-xl bg-secondary" />
											<div className="h-20 rounded-xl bg-primary/20" />
											<div className="h-20 rounded-xl bg-accent" />
										</div>
									</div>
									<div className="rounded-2xl border border-border bg-background p-3 shadow-primary/10 shadow-xl">
										<div className="mb-3 flex items-center gap-2">
											<div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
												<Bot className="h-4 w-4" aria-hidden="true" />
											</div>
											<span className="font-bold text-sm">Talqo</span>
										</div>
										<p className="rounded-2xl bg-muted p-3 text-muted-foreground text-sm">
											{t("landing.heroSection.widgetMessage")}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div
						className="absolute -right-4 -bottom-5 hidden rounded-2xl border border-border bg-primary px-4 py-3 font-bold text-primary-foreground text-sm shadow-2xl shadow-primary/20 md:block"
						aria-hidden="true"
					>
						<div className="flex items-center gap-2">
							<CornerDownRight className="h-4 w-4" />
							{t("landing.heroSection.tryLive")}
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
