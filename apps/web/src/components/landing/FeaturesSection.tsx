import { Link } from "@tanstack/react-router"
import { ArrowRight, Bot } from "lucide-react"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { getCapabilities, getLandingSteps, getUseCases } from "@/data/landing"
import { cn } from "@/lib/utils"

export function FeaturesSection() {
	const { t } = useTranslation()
	const steps = useMemo(() => getLandingSteps(t), [t])
	const useCases = useMemo(() => getUseCases(t), [t])
	const capabilities = useMemo(() => getCapabilities(t), [t])

	return (
		<section className="relative overflow-hidden bg-muted px-6 py-20 text-foreground">
			<div
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,var(--secondary),transparent_24%),radial-gradient(circle_at_84%_34%,var(--accent),transparent_24%)] opacity-70"
				aria-hidden="true"
			/>
			<div className="container relative mx-auto max-w-7xl">
				<div className="grid gap-4 rounded-4xl border border-border bg-card/80 p-3 shadow-2xl shadow-primary/5 backdrop-blur md:grid-cols-3">
					{steps.map((step, index) => {
						const Icon = step.icon

						return (
							<div
								className="relative flex min-h-36 items-start gap-4 rounded-[1.4rem] bg-background p-5 text-foreground"
								key={step.id}
							>
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
									<Icon className="h-5 w-5" aria-hidden="true" />
								</div>
								<div>
									<p className="text-primary text-xs uppercase tracking-[0.3em]">
										0{index + 1}
									</p>
									<h2 className="font-black text-2xl tracking-tight">
										{step.label}
									</h2>
									<p className="mt-2 max-w-xs text-muted-foreground text-sm leading-6">
										{step.description}
									</p>
								</div>
								{index < steps.length - 1 ? (
									<ArrowRight
										className="absolute top-1/2 -right-5 z-10 hidden h-6 w-6 -translate-y-1/2 text-primary md:block"
										aria-hidden="true"
									/>
								) : null}
							</div>
						)
					})}
				</div>

				<div className="mt-24 flex max-w-3xl flex-col gap-4">
					<p className="font-bold text-primary text-sm uppercase tracking-[0.28em]">
						{t("landing.useCases.eyebrow")}
					</p>
					<h2 className="text-balance font-black text-4xl tracking-[-0.05em] sm:text-6xl">
						{t("landing.useCases.title")}
					</h2>
				</div>

				<div className="mt-10 grid gap-5 lg:grid-cols-3">
					{useCases.map((useCase) => {
						const Icon = useCase.icon

						return (
							<article
								className="group overflow-hidden rounded-4xl border border-border bg-card p-4 text-card-foreground shadow-primary/5 shadow-xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10"
								key={useCase.id}
							>
								<div
									className={cn(
										"min-h-64 rounded-[1.45rem] border border-border p-4 text-foreground",
										useCase.accent,
									)}
								>
									<div className="mb-5 flex items-center justify-between">
										<div className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-2 font-bold text-sm shadow-sm backdrop-blur">
											<Icon
												className="h-4 w-4 text-primary"
												aria-hidden="true"
											/>
											{useCase.label}
										</div>
										<div className="h-9 w-16 rounded-full bg-background/70" />
									</div>
									<div className="grid gap-3">
										<div className="h-16 rounded-2xl bg-foreground" />
										<div className="grid grid-cols-3 gap-2">
											<div className="h-12 rounded-xl bg-background/80" />
											<div className="h-12 rounded-xl bg-background/55" />
											<div className="h-12 rounded-xl bg-background/80" />
										</div>
									</div>
								</div>
								<div className="relative -mt-16 ml-auto w-[88%] rounded-3xl border border-border bg-background p-3 shadow-2xl shadow-primary/10">
									<p className="ml-auto w-fit rounded-2xl bg-primary px-4 py-3 text-right text-primary-foreground text-sm">
										{useCase.question}
									</p>
									<div className="mt-3 flex items-start gap-2">
										<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
											<Bot className="h-4 w-4" aria-hidden="true" />
										</div>
										<p className="rounded-2xl bg-muted px-4 py-3 text-muted-foreground text-sm">
											{useCase.answer}
										</p>
									</div>
								</div>
							</article>
						)
					})}
				</div>

				<div className="mt-20 grid gap-8 rounded-4xl border border-border bg-card p-6 text-card-foreground shadow-2xl shadow-primary/5 md:grid-cols-[0.85fr_1.15fr] md:p-8">
					<div>
						<p className="font-bold text-primary text-sm uppercase tracking-[0.28em]">
							{t("landing.capabilities.eyebrow")}
						</p>
						<h2 className="mt-4 max-w-md text-balance font-black text-4xl tracking-[-0.05em] sm:text-5xl">
							{t("landing.capabilities.title")}
						</h2>
					</div>
					<div className="flex flex-wrap content-start gap-3">
						{capabilities.map((capability) => {
							const Icon = capability.icon

							return (
								<div
									className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-3 font-semibold text-sm transition hover:border-primary/40 hover:bg-secondary"
									key={capability.id}
								>
									<Icon className="h-4 w-4 text-primary" aria-hidden="true" />
									{capability.label}
								</div>
							)
						})}
					</div>
				</div>

				<div className="mt-16 rounded-4xl border border-border bg-primary p-6 text-center text-primary-foreground shadow-2xl shadow-primary/20 sm:p-8">
					<h2 className="font-black text-4xl tracking-[-0.05em]">
						{t("landing.finalCta.title")}
					</h2>
					<p className="mx-auto mt-3 max-w-xl font-medium text-primary-foreground/85">
						{t("landing.finalCta.description")}
					</p>
					<div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
						<Button
							variant="secondary"
							className="rounded-full px-6 font-bold"
							asChild
						>
							<Link to="/register">{t("landing.finalCta.startFree")}</Link>
						</Button>
						<Button
							variant="outline"
							className="rounded-full border-primary-foreground/40 bg-transparent px-6 font-bold text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
							asChild
						>
							<a
								href="https://github.com/talqo/talqo-platform/tree/main/docs"
								target="_blank"
								rel="noopener noreferrer"
							>
								{t("landing.finalCta.viewDocs")}
							</a>
						</Button>
					</div>
				</div>
			</div>
		</section>
	)
}
