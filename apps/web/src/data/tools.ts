export type Tool = {
	id: string
	name: string
	description?: string
	color: "blue" | "green" | "purple" | "red" | "yellow"
	icon: string
}

const DEFAULT_USED_TOOL_KEYS = [
	{ id: "1", key: "productDatabase", color: "blue" as const, icon: "DB" },
	{
		id: "2",
		key: "customKnowledgeBase",
		color: "green" as const,
		icon: "JSON",
	},
]

const PRECONFIGURED_TOOL_KEYS = [
	{ id: "cal", key: "calendar", color: "yellow" as const, icon: "CAL" },
	{ id: "doc", key: "documentSearch", color: "red" as const, icon: "DOC" },
	{ id: "sql", key: "sqlDatabase", color: "green" as const, icon: "SQL" },
	{ id: "api", key: "restApi", color: "blue" as const, icon: "API" },
]

export const getDefaultUsedTools = (t: (key: string) => string): Tool[] =>
	DEFAULT_USED_TOOL_KEYS.map((tool) => ({
		id: tool.id,
		name: t(`tools.toolNames.${tool.key}`),
		color: tool.color,
		icon: tool.icon,
	}))

export const getPreconfiguredTools = (t: (key: string) => string): Tool[] =>
	PRECONFIGURED_TOOL_KEYS.map((tool) => ({
		id: tool.id,
		name: t(`tools.toolNames.${tool.key}`),
		description: t(`tools.toolDescriptions.${tool.key}`),
		color: tool.color,
		icon: tool.icon,
	}))

export function getToolDescription(
	name: string,
	t: (key: string) => string,
): string {
	if (name.includes(t("tools.toolNames.productDatabase")))
		return t("tools.toolDescriptions.readOnlyConnector")
	if (name.includes(t("tools.toolNames.customKnowledgeBase")))
		return t("tools.toolDescriptions.staticFallbackInfo")
	return t("tools.toolDescriptions.toolConnector")
}

export function generateToolId(): string {
	// Fallback for browsers without crypto.randomUUID
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID()
	}
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
