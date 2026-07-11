import { Check, Palette } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MOTIFS } from "@/lib/motifs"
import { useMotif } from "@/lib/useMotif"
import { cn } from "@/lib/utils"

export function MotifSwitcher({ className }: { className?: string }) {
	const { t } = useTranslation()
	const { motif: activeMotif, setMotif } = useMotif()
	const active = MOTIFS.find((m) => m.id === activeMotif) ?? MOTIFS[0]

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className={cn("gap-2", className)}>
					<Palette className="h-4 w-4" />
					<span className={cn("h-2.5 w-2.5 rounded-full", active.dotClass)} />
					<span className="hidden sm:inline">{t(active.labelKey)}</span>
					<span className="sr-only">{t("motifs.switch")}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{MOTIFS.map((motif) => (
					<DropdownMenuItem
						key={motif.id}
						onClick={() => setMotif(motif.id)}
						className="flex items-center justify-between gap-4"
					>
						<span className="flex items-center gap-2">
							<span
								className={cn("h-2.5 w-2.5 rounded-full", motif.dotClass)}
							/>
							{t(motif.labelKey)}
						</span>
						{motif.id === activeMotif && <Check className="h-4 w-4" />}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
