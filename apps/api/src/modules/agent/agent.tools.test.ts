import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ModelMessage } from "ai";
import { createContextTools } from "./agent.tools";

const toolCallOptions = {
	toolCallId: "test",
	messages: [] as ModelMessage[],
};

describe("createContextTools", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(join(tmpdir(), "agent-test-"));
		await writeFile(join(tempDir, "readme.txt"), "hello from readme");
		await writeFile(join(tempDir, "data.json"), '{"key": "value"}');
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("listFiles", () => {
		it("lists files in the root directory", async () => {
			const { listFiles } = createContextTools(tempDir);
			if (!listFiles.execute) throw new Error("execute not defined");
			const result = await listFiles.execute({ path: "." }, toolCallOptions);
			expect("entries" in result).toBe(true);
			const { entries } = result as {
				entries: { name: string; type: string }[];
			};
			const names = entries.map((e) => e.name).sort();
			expect(names).toEqual(["data.json", "readme.txt"]);
			expect(entries.every((e) => e.type === "file")).toBe(true);
		});

		it("returns error for nonexistent directory", async () => {
			const { listFiles } = createContextTools(tempDir);
			if (!listFiles.execute) throw new Error("execute not defined");
			const result = await listFiles.execute(
				{ path: "nonexistent" },
				toolCallOptions,
			);
			expect(result).toHaveProperty("error");
		});

		it("blocks path traversal", async () => {
			const { listFiles } = createContextTools(tempDir);
			if (!listFiles.execute) throw new Error("execute not defined");
			const result = await listFiles.execute(
				{ path: "../../etc" },
				toolCallOptions,
			);
			expect(result).toHaveProperty("error");
			if ("error" in result) {
				expect(result.error).toContain("Path traversal detected");
			}
		});
	});

	describe("readFile", () => {
		it("reads file contents", async () => {
			const { readFile } = createContextTools(tempDir);
			if (!readFile.execute) throw new Error("execute not defined");
			const result = await readFile.execute(
				{ path: "readme.txt" },
				toolCallOptions,
			);
			expect(result).toEqual({ content: "hello from readme", totalLines: 1 });
		});

		it("defaults to first 500 lines when no range is given", async () => {
			const lines = Array.from({ length: 600 }, (_, i) => `line ${i + 1}`);
			await writeFile(join(tempDir, "big.txt"), lines.join("\n"));
			const { readFile } = createContextTools(tempDir);
			if (!readFile.execute) throw new Error("execute not defined");
			const result = await readFile.execute(
				{ path: "big.txt" },
				toolCallOptions,
			);
			expect("content" in result).toBe(true);
			const { content, totalLines } = result as {
				content: string;
				totalLines: number;
			};
			expect(totalLines).toBe(600);
			expect(content.split("\n")).toHaveLength(500);
			expect(content.split("\n")[0]).toBe("line 1");
		});

		it("respects startLine and endLine", async () => {
			const lines = Array.from({ length: 10 }, (_, i) => `line ${i + 1}`);
			await writeFile(join(tempDir, "numbered.txt"), lines.join("\n"));
			const { readFile } = createContextTools(tempDir);
			if (!readFile.execute) throw new Error("execute not defined");
			const result = await readFile.execute(
				{ path: "numbered.txt", startLine: 3, endLine: 5 },
				toolCallOptions,
			);
			expect("content" in result).toBe(true);
			const { content } = result as { content: string };
			expect(content).toBe("line 3\nline 4\nline 5");
		});

		it("returns error for nonexistent file", async () => {
			const { readFile } = createContextTools(tempDir);
			if (!readFile.execute) throw new Error("execute not defined");
			const result = await readFile.execute(
				{ path: "missing.txt" },
				toolCallOptions,
			);
			expect(result).toHaveProperty("error");
		});

		it("blocks path traversal", async () => {
			const { readFile } = createContextTools(tempDir);
			if (!readFile.execute) throw new Error("execute not defined");
			const result = await readFile.execute(
				{ path: "../../../etc/passwd" },
				toolCallOptions,
			);
			expect(result).toHaveProperty("error");
			if ("error" in result) {
				expect(result.error).toContain("Path traversal detected");
			}
		});
	});
});
