import { readdir, readFile } from "node:fs/promises";
import { normalize, resolve } from "node:path";
import { tool } from "ai";
import { z } from "zod";

function createSafePath(rootDir: string) {
	const resolved = resolve(rootDir);
	return (relative: string): string => {
		const target = resolve(resolved, normalize(relative));
		if (!target.startsWith(resolved)) {
			throw new Error("Path traversal detected");
		}
		return target;
	};
}

export function createContextTools(contextDirectory: string) {
	const safePath = createSafePath(contextDirectory);

	return {
		listFiles: tool({
			description:
				"List files and directories in the user's context directory. Use a relative path from the root.",
			inputSchema: z.object({
				path: z
					.string()
					.default(".")
					.describe("Relative path within the context directory"),
			}),
			execute: async ({ path }) => {
				try {
					const dirPath = safePath(path);
					const entries = await readdir(dirPath, { withFileTypes: true });
					return {
						entries: entries.map((e) => ({
							name: e.name,
							type: e.isDirectory() ? "directory" : "file",
						})),
					};
				} catch (error) {
					return {
						error: `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`,
					};
				}
			},
		}),

		readFile: tool({
			description:
				"Read the contents of a text file in the user's context directory. Use a relative path from the root.",
			inputSchema: z.object({
				path: z
					.string()
					.describe("Relative path to the file within the context directory"),
			}),
			execute: async ({ path }) => {
				try {
					const filePath = safePath(path);
					const content = await readFile(filePath, "utf-8");
					return { content };
				} catch (error) {
					return {
						error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
					};
				}
			},
		}),
	};
}
