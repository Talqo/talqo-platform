import { describe, expect, it } from "bun:test";
import { checkBlacklist } from "./agent.blacklist";

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
