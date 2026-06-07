export type Chunk = { index: number; text: string }

/**
 * Splits text into overlapping chunks with word-boundary alignment.
 * At each chunkSize mark snaps backward to the nearest preceding whitespace;
 * the next chunk starts at (endPosition - overlap) snapped backward.
 */
export function chunkText(
	text: string,
	chunkSize = 2000,
	overlap = 400,
): Chunk[] {
	if (chunkSize <= 0) {
		throw new Error(`chunkSize must be > 0, got ${chunkSize}`)
	}
	if (overlap < 0) {
		throw new Error(`overlap must be >= 0, got ${overlap}`)
	}
	if (overlap >= chunkSize) {
		throw new Error(
			`overlap must be < chunkSize (${chunkSize}), got ${overlap}`,
		)
	}
	if (text.length === 0) return []
	if (text.length <= chunkSize) return [{ index: 0, text }]

	const chunks: Chunk[] = []
	let start = 0
	let index = 0

	while (start < text.length) {
		const rawEnd = start + chunkSize

		if (rawEnd >= text.length) {
			// Last chunk — take everything remaining
			chunks.push({ index, text: text.slice(start) })
			break
		}

		// Snap backward from rawEnd to the nearest whitespace
		const snappedEnd = snapToWordBoundary(text, start, rawEnd)

		chunks.push({ index, text: text.slice(start, snappedEnd) })
		index++

		// Next chunk starts at (endPosition - overlap) snapped backward
		const nextStartRaw = snappedEnd - overlap
		const nextStart = snapToWordBoundary(text, start, nextStartRaw)
		start = Math.max(nextStart, start + 1)
	}

	return chunks
}

/**
 * Looks backward from `pos` toward `start` to find whitespace.
 * Returns the position of the whitespace if found, otherwise `pos` (hard cut).
 * The returned value is used as the exclusive end of the slice, so the
 * whitespace character itself is excluded from the chunk.
 *
 * Backward search is capped to 200 characters from `pos` so that long
 * runs without whitespace don't force an excessive scan.
 */
function snapToWordBoundary(text: string, start: number, pos: number): number {
	const limit = Math.max(start, pos - 200)
	for (let i = pos; i > limit; i--) {
		if (/\s/.test(text[i - 1])) {
			// Exclude the whitespace itself — return the position before it
			return i - 1
		}
	}
	// No whitespace found within 200-char window — hard cut
	return pos
}
