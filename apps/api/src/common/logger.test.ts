import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test"
import { logger } from "./logger"

describe("logger", () => {
	let stdoutSpy: ReturnType<typeof spyOn<typeof process.stdout, "write">>
	let stderrSpy: ReturnType<typeof spyOn<typeof process.stderr, "write">>

	beforeEach(() => {
		stdoutSpy = spyOn(process.stdout, "write").mockImplementation(() => true)
		stderrSpy = spyOn(process.stderr, "write").mockImplementation(() => true)
	})

	afterEach(() => {
		stdoutSpy.mockRestore()
		stderrSpy.mockRestore()
	})

	function parseStdout(): Record<string, unknown> {
		const call = stdoutSpy.mock.calls[0] as [string]
		return JSON.parse(call[0])
	}

	function parseStderr(): Record<string, unknown> {
		const call = stderrSpy.mock.calls[0] as [string]
		return JSON.parse(call[0])
	}

	describe("logger.info", () => {
		it("writes to stdout, not stderr", () => {
			logger.info("msg")
			expect(stdoutSpy).toHaveBeenCalledTimes(1)
			expect(stderrSpy).not.toHaveBeenCalled()
		})

		it("outputs a single JSON line ending with newline", () => {
			logger.info("msg")
			const raw = (stdoutSpy.mock.calls[0] as [string])[0]
			expect(raw.endsWith("\n")).toBe(true)
			expect(() => JSON.parse(raw)).not.toThrow()
		})

		it("includes level, message, and ISO timestamp", () => {
			logger.info("hello")
			const entry = parseStdout()
			expect(entry.level).toBe("info")
			expect(entry.message).toBe("hello")
			expect(typeof entry.timestamp).toBe("string")
			expect(Number.isNaN(Date.parse(entry.timestamp as string))).toBe(false)
		})

		it("spreads metadata fields at top level", () => {
			logger.info("msg", { userId: 42, action: "login" })
			const entry = parseStdout()
			expect(entry.userId).toBe(42)
			expect(entry.action).toBe("login")
		})

		it("omits meta key when no metadata given", () => {
			logger.info("msg")
			const entry = parseStdout()
			expect("meta" in entry).toBe(false)
		})
	})

	describe("logger.warn", () => {
		it("writes to stdout, not stderr", () => {
			logger.warn("msg")
			expect(stdoutSpy).toHaveBeenCalledTimes(1)
			expect(stderrSpy).not.toHaveBeenCalled()
		})

		it("sets level to warn", () => {
			logger.warn("msg")
			expect(parseStdout().level).toBe("warn")
		})

		it("spreads metadata fields at top level", () => {
			logger.warn("msg", { reason: "rate_limited" })
			expect(parseStdout().reason).toBe("rate_limited")
		})
	})

	describe("logger.error", () => {
		it("writes to stderr, not stdout", () => {
			logger.error("msg")
			expect(stderrSpy).toHaveBeenCalledTimes(1)
			expect(stdoutSpy).not.toHaveBeenCalled()
		})

		it("sets level to error", () => {
			logger.error("msg")
			expect(parseStderr().level).toBe("error")
		})

		it("spreads metadata fields at top level", () => {
			logger.error("failed", { stack: "Error: boom", path: "/auth/login" })
			const entry = parseStderr()
			expect(entry.stack).toBe("Error: boom")
			expect(entry.path).toBe("/auth/login")
		})
	})
})
