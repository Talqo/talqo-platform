export type ClientEntry = {
	id: string
	name: string
	status: "active" | "suspended"
	aiProvider: string
	tokenUsage: string
}
