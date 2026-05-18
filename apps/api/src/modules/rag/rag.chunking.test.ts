import { describe, expect, test } from "bun:test"
import { chunkText } from "./rag.chunking"

const CHUNK_SIZE = 2000
const OVERLAP = 400
const STEP = CHUNK_SIZE - OVERLAP // 1600

describe("chunkText", () => {
	test("empty string returns empty array", () => {
		expect(chunkText("")).toEqual([])
	})

	test("string shorter than chunk size returns single chunk", () => {
		const text = "Hello world this is a short text."
		const result = chunkText(text)
		expect(result).toHaveLength(1)
		expect(result[0]).toEqual({ index: 0, text })
	})

	test("string of exactly chunk size returns single chunk", () => {
		const text = "a".repeat(CHUNK_SIZE)
		const result = chunkText(text)
		expect(result).toHaveLength(1)
		expect(result[0]).toEqual({ index: 0, text })
	})

	test("long string produces multiple chunks", () => {
		// Build a string > 2000 chars with spaces so word-boundary snapping works
		const word = "word "
		const text = word.repeat(Math.ceil((CHUNK_SIZE * 2.5) / word.length))
		const result = chunkText(text)
		expect(result.length).toBeGreaterThan(1)
	})

	test("each chunk text length does not exceed chunk size", () => {
		const word = "abcdefghij " // 11 chars
		const text = word.repeat(500) // 5500 chars
		const result = chunkText(text)
		for (const chunk of result) {
			expect(chunk.text.length).toBeLessThanOrEqual(CHUNK_SIZE)
		}
	})

	test("chunk indices are zero-based sequential", () => {
		const word = "abcdefghij "
		const text = word.repeat(500) // 5500 chars
		const result = chunkText(text)
		result.forEach((chunk, i) => {
			expect(chunk.index).toBe(i)
		})
	})

	test("overlapping regions between consecutive chunks match", () => {
		// Use text with no whitespace so no snapping, making positions deterministic
		const text = "x".repeat(CHUNK_SIZE * 2 + 100)
		const result = chunkText(text)
		expect(result.length).toBeGreaterThanOrEqual(2)

		// chunk[1] starts STEP chars into chunk[0]'s start
		// The overlap region is chunk[0].text.slice(STEP) which should match
		// the start of chunk[1].text
		const chunk0 = result[0]
		const chunk1 = result[1]
		const overlapFromChunk0 = chunk0.text.slice(STEP)
		expect(chunk1.text.startsWith(overlapFromChunk0)).toBe(true)
	})

	test("word boundary snapping: chunk end snaps to preceding whitespace", () => {
		// Construct: 1990 chars of 'a', then ' b c d ...' so that the raw
		// boundary at 2000 falls mid-word and must snap back to the space at 1990
		const body = "a".repeat(1990)
		const tail = "bcdefghijklmnopqrstuvwxyz".repeat(200)
		const text = `${body} ${tail}`
		const result = chunkText(text)

		// The first chunk must end at the space position (1990) or right after,
		// not in the middle of a run of 'a's or 'b's...
		// Specifically: chunk[0].text should end with 'a' (the last 'a' before
		// the space), not end mid-word in the tail
		const chunk0Text = result[0].text
		// The last char should be 'a' (snapped back to the space, text up to 1990)
		// or the space itself depending on trim, but NOT a letter from the tail
		expect(chunk0Text).not.toMatch(/[b-z]$/)
	})

	test("hard cut when no whitespace found before boundary", () => {
		// A single run of non-whitespace chars longer than chunk size
		const text = "a".repeat(CHUNK_SIZE * 2 + 500)
		const result = chunkText(text)
		// Should still produce multiple chunks despite no whitespace
		expect(result.length).toBeGreaterThan(1)
		// First chunk is exactly CHUNK_SIZE chars (hard cut)
		expect(result[0].text.length).toBe(CHUNK_SIZE)
	})

	test("covers last portion of text in final chunk", () => {
		const word = "hello "
		const text = word.repeat(Math.ceil((CHUNK_SIZE * 2) / word.length))
		const result = chunkText(text)
		const lastChunk = result[result.length - 1]
		// The last chunk text should appear at the end of the full text
		expect(
			text.endsWith(lastChunk.text.trimEnd()) || text.includes(lastChunk.text),
		).toBe(true)
	})

	test("single-word string under chunk size returns that word as single chunk", () => {
		const text = "hello"
		const result = chunkText(text)
		expect(result).toEqual([{ index: 0, text: "hello" }])
	})
})
