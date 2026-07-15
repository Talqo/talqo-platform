import { Check, Palette } from "lucide-react"
import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { COLORS, FONTS, RADII } from "@/lib/appearance"
import { useAppearance } from "@/lib/useAppearance"
import { cn } from "@/lib/utils"

export function AppearanceMenu({ className }: { className?: string }) {
	const { t } = useTranslation()
	const {
		color,
		font,
		radius,
		customColor,
		setColor,
		setFont,
		setRadius,
		setCustomColor,
	} = useAppearance()
	const activeColor = COLORS.find((c) => c.id === color) ?? COLORS[0]
	const colorInputRef = useRef<HTMLInputElement>(null)

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="sm" className={cn("gap-2", className)}>
					<Palette className="h-4 w-4" />
					<span
						className={cn("h-2.5 w-2.5 rounded-full", activeColor.dotClass)}
						style={
							activeColor.id === "custom"
								? { backgroundColor: customColor }
								: undefined
						}
					/>
					<span className="hidden sm:inline">{t("appearance.title")}</span>
					<span className="sr-only">{t("appearance.title")}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72">
				<div className="space-y-4">
					<section>
						<h4 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
							{t("appearance.colors")}
						</h4>
						<div className="grid grid-cols-5 gap-2">
							{COLORS.map((c) => (
								<button
									key={c.id}
									type="button"
									onClick={() => {
										setColor(c.id)
										if (c.id === "custom") {
											colorInputRef.current?.click()
										}
									}}
									className={cn(
										"relative flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 transition-all",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
										color === c.id && "ring-2 ring-ring",
									)}
									title={t(c.labelKey)}
									aria-label={t(c.labelKey)}
								>
									<span
										className={cn("h-6 w-6 rounded-full border", c.dotClass)}
										style={
											c.id === "custom"
												? { backgroundColor: customColor }
												: undefined
										}
									/>
									{color === c.id && (
										<Check className="absolute h-3.5 w-3.5 text-primary-foreground mix-blend-difference" />
									)}
								</button>
							))}
						</div>
						<input
							ref={colorInputRef}
							type="color"
							value={customColor}
							onChange={(event) => {
								setColor("custom")
								setCustomColor(event.target.value)
							}}
							className="sr-only"
							aria-label={t("appearance.customColor")}
						/>
					</section>

					<section>
						<h4 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
							{t("appearance.fonts")}
						</h4>
						<div className="grid grid-cols-2 gap-2">
							{FONTS.map((f) => (
								<button
									key={f.id}
									type="button"
									onClick={() => setFont(f.id)}
									className={cn(
										"flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors",
										"hover:bg-accent hover:text-accent-foreground",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
										font === f.id && "border-primary bg-primary/10",
									)}
									style={{ fontFamily: f.family }}
								>
									<span>{t(f.labelKey)}</span>
									{font === f.id && <Check className="h-3.5 w-3.5" />}
								</button>
							))}
						</div>
					</section>

					<section>
						<h4 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
							{t("appearance.borders")}
						</h4>
						<div className="flex gap-2">
							{RADII.map((r) => (
								<button
									key={r.id}
									type="button"
									onClick={() => setRadius(r.id)}
									className={cn(
										"flex flex-1 flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs transition-colors",
										"hover:bg-accent hover:text-accent-foreground",
										"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
										radius === r.id && "border-primary bg-primary/10",
									)}
								>
									<span
										className="h-6 w-8 border-2 border-current bg-muted"
										style={{ borderRadius: r.value }}
									/>
									<span>{t(r.labelKey)}</span>
								</button>
							))}
						</div>
					</section>
				</div>
			</PopoverContent>
		</Popover>
	)
}
