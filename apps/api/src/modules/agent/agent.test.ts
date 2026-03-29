import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ModelMessage } from "ai";
import { checkBlacklist } from "./agent.blacklist";
import { createContextTools } from "./agent.tools";

const toolCallOptions = {
	toolCallId: "test",
	messages: [] as ModelMessage[],
};

describe("checkBlacklist", () => {
	it("returns false for empty blacklist", () => {
		expect(checkBlacklist("hello world", [])).toBe(false);
	});

	it("detects case-insensitive match", () => {
		expect(checkBlacklist("Hello World", ["hello"])).toBe(true);
		expect(checkBlacklist("hello world", ["HELLO"])).toBe(true);
	});

	it("detects substring match", () => {
		expect(checkBlacklist("I cannot help with that", ["cannot"])).toBe(true);
	});

	it("returns false when no words match", () => {
		expect(checkBlacklist("hello world", ["foo", "bar"])).toBe(false);
	});

	it("matches any word in the list", () => {
		expect(checkBlacklist("this is bad", ["good", "bad"])).toBe(true);
	});

	it("returns false for empty text", () => {
		expect(checkBlacklist("", ["word"])).toBe(false);
	});
});

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
			expect(result).toEqual({ content: "hello from readme" });
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
