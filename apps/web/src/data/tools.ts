export interface Tool {
	id: string;
	name: string;
	description?: string;
	color: "blue" | "green" | "purple" | "red" | "yellow";
	icon: string;
}

export const DEFAULT_USED_TOOLS: Tool[] = [
	{
		id: "1",
		name: "Product Database",
		color: "blue",
		icon: "DB",
	},
	{
		id: "2",
		name: "Custom Knowledge Base",
		color: "green",
		icon: "JSON",
	},
	{
		id: "3",
		name: "Internet Search",
		color: "purple",
		icon: "WEB",
	},
];

export const PRECONFIGURED_TOOLS: Tool[] = [
	{
		id: "cal",
		name: "Calendar",
		description: "Schedule management",
		color: "yellow",
		icon: "CAL",
	},
	{
		id: "doc",
		name: "Document Search",
		description: "File content search",
		color: "red",
		icon: "DOC",
	},
	{
		id: "sql",
		name: "SQL Database",
		description: "Database queries",
		color: "green",
		icon: "SQL",
	},
	{
		id: "api",
		name: "REST API",
		description: "Custom API endpoints",
		color: "blue",
		icon: "API",
	},
];

export function getToolDescription(name: string): string {
	if (name.includes("Database")) return "Read-only connector";
	if (name.includes("Knowledge")) return "Static fallback info";
	if (name.includes("Search")) return "Web search capabilities";
	return "Tool connector";
}

export function generateToolId(): string {
	// Fallback for browsers without crypto.randomUUID
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
