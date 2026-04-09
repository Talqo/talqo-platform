import { readdir, readFile } from "node:fs/promises"
import { normalize, resolve } from "node:path"
import { tool } from "ai"
import { z } from "zod"

function createSafePath(rootDir: string) {
	const resolved = resolve(rootDir)
	return (relative: string): string => {
		const target = resolve(resolved, normalize(relative))
		// Use trailing slash to prevent sibling-directory bypass (e.g. /ctx matching /ctx-evil)
		if (target !== resolved && !target.startsWith(`${resolved}/`)) {
			throw new Error("Path traversal detected")
		}
		return target
	}
}

export function createContextTools(contextDirectory: string) {
	const safePath = createSafePath(contextDirectory)

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
					const dirPath = safePath(path)
					const entries = await readdir(dirPath, { withFileTypes: true })
					return {
						entries: entries.map((e) => ({
							name: e.name,
							type: e.isDirectory() ? "directory" : "file",
						})),
					}
				} catch (error) {
					return {
						error: `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`,
					}
				}
			},
		}),

		readFile: tool({
			description:
				"Read the contents of a text file in the user's context directory. Use a relative path from the root. If no line range is provided, returns the first 500 lines.",
			inputSchema: z.object({
				path: z
					.string()
					.describe("Relative path to the file within the context directory"),
				startLine: z
					.number()
					.int()
					.positive()
					.optional()
					.describe("1-based line number to start reading from (inclusive)"),
				endLine: z
					.number()
					.int()
					.positive()
					.optional()
					.describe("1-based line number to stop reading at (inclusive)"),
			}),
			execute: async ({ path, startLine, endLine }) => {
				if (
					endLine !== undefined &&
					startLine !== undefined &&
					endLine < startLine
				) {
					return {
						error: "endLine must be greater than or equal to startLine",
					}
				}
				try {
					const filePath = safePath(path)
					const raw = await readFile(filePath, "utf-8")
					const lines = raw.split("\n")
					const total = lines.length
					const from = (startLine ?? 1) - 1
					const to = endLine ?? Math.min(from + 500, total)
					const content = lines.slice(from, to).join("\n")
					return { content, totalLines: total }
				} catch (error) {
					return {
						error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
					}
				}
			},
		}),
	}
}
