export type MotifId = "forest" | "sunset" | "ocean" | "berry"

export type Motif = {
	id: MotifId
	labelKey: string
	dotClass: string
}

export const MOTIFS: Motif[] = [
	{
		id: "forest",
		labelKey: "motifs.forest",
		dotClass: "bg-green-600",
	},
	{
		id: "sunset",
		labelKey: "motifs.sunset",
		dotClass: "bg-orange-500",
	},
	{
		id: "ocean",
		labelKey: "motifs.ocean",
		dotClass: "bg-blue-600",
	},
	{
		id: "berry",
		labelKey: "motifs.berry",
		dotClass: "bg-purple-600",
	},
]

export const DEFAULT_MOTIF: MotifId = "forest"
