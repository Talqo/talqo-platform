export type ColorId =
	| "green"
	| "orange"
	| "blue"
	| "purple"
	| "gold"
	| "royal-blue"
	| "cyan"
	| "emerald"
	| "pink"
	| "slate"
	| "custom"

export type FontId =
	| "inter"
	| "source-sans"
	| "manrope"
	| "nunito"
	| "merriweather"
	| "jetbrains-mono"
	| "playfair"

export type RadiusId = "sharp" | "slight" | "round" | "pill"

export type ColorTheme = {
	id: ColorId
	labelKey: string
	dotClass: string
}

export type FontOption = {
	id: FontId
	labelKey: string
	family: string
}

export type RadiusOption = {
	id: RadiusId
	labelKey: string
	value: string
}

export const COLORS: ColorTheme[] = [
	{ id: "green", labelKey: "appearance.color.green", dotClass: "bg-green-600" },
	{
		id: "orange",
		labelKey: "appearance.color.orange",
		dotClass: "bg-orange-500",
	},
	{ id: "blue", labelKey: "appearance.color.blue", dotClass: "bg-blue-600" },
	{
		id: "purple",
		labelKey: "appearance.color.purple",
		dotClass: "bg-purple-600",
	},
	{ id: "gold", labelKey: "appearance.color.gold", dotClass: "bg-amber-600" },
	{
		id: "royal-blue",
		labelKey: "appearance.color.royalBlue",
		dotClass: "bg-blue-700",
	},
	{ id: "cyan", labelKey: "appearance.color.cyan", dotClass: "bg-cyan-600" },
	{
		id: "emerald",
		labelKey: "appearance.color.emerald",
		dotClass: "bg-emerald-600",
	},
	{ id: "pink", labelKey: "appearance.color.pink", dotClass: "bg-pink-600" },
	{ id: "slate", labelKey: "appearance.color.slate", dotClass: "bg-slate-600" },
	{
		id: "custom",
		labelKey: "appearance.color.custom",
		dotClass: "",
	},
]

export const FONTS: FontOption[] = [
	{
		id: "inter",
		labelKey: "appearance.font.inter",
		family: "Inter, ui-sans-serif, system-ui, sans-serif",
	},
	{
		id: "source-sans",
		labelKey: "appearance.font.sourceSans",
		family: '"Source Sans 3", Inter, ui-sans-serif, system-ui, sans-serif',
	},
	{
		id: "manrope",
		labelKey: "appearance.font.manrope",
		family: "Manrope, Inter, ui-sans-serif, system-ui, sans-serif",
	},
	{
		id: "nunito",
		labelKey: "appearance.font.nunito",
		family: "Nunito, Inter, ui-sans-serif, system-ui, sans-serif",
	},
	{
		id: "merriweather",
		labelKey: "appearance.font.merriweather",
		family: "Merriweather, Georgia, serif",
	},
	{
		id: "jetbrains-mono",
		labelKey: "appearance.font.jetbrainsMono",
		family: '"JetBrains Mono", ui-monospace, monospace',
	},
	{
		id: "playfair",
		labelKey: "appearance.font.playfair",
		family: '"Playfair Display", Georgia, serif',
	},
]

export const RADII: RadiusOption[] = [
	{ id: "sharp", labelKey: "appearance.radius.sharp", value: "0rem" },
	{ id: "slight", labelKey: "appearance.radius.slight", value: "0.375rem" },
	{ id: "round", labelKey: "appearance.radius.round", value: "0.75rem" },
	{ id: "pill", labelKey: "appearance.radius.pill", value: "1.5rem" },
]

export const DEFAULT_COLOR: ColorId = "green"
export const DEFAULT_FONT: FontId = "inter"
export const DEFAULT_RADIUS: RadiusId = "slight"
export const DEFAULT_CUSTOM_COLOR = "#16a34a"
