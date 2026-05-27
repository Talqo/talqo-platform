import type { MessageData, SseEvent } from "./types"

export function parseSseBuffer(buffer: string): {
	items: (SseEvent | null)[]
	remainder: string
} {
	const events: (SseEvent | null)[] = []
	const rawEvents = buffer.split(/\r?\n\r?\n/)
	const remainder = rawEvents.pop() ?? ""
	for (const raw of rawEvents) {
		const lines = raw
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean)
		const eventName =
			lines
				.find((l) => l.startsWith("event:"))
				?.slice(6)
				.trim() ?? ""
		const dataLines = lines
			.filter((l) => l.startsWith("data:"))
			.map((l) => l.slice(5).trim())
		if (!dataLines.length) continue
		const dataStr = dataLines.join("\n")
		try {
			const payload = JSON.parse(dataStr) as Record<string, unknown>
			switch (eventName) {
				case "user_message":
					events.push({
						type: "user_message",
						message: payload as unknown as MessageData,
					})
					break
				case "token":
					events.push({
						type: "token",
						content: typeof payload.content === "string" ? payload.content : "",
					})
					break
				case "done":
					events.push({
						type: "done",
						message: payload as unknown as MessageData,
					})
					break
				case "error":
					events.push({
						type: "error",
						code: typeof payload.code === "string" ? payload.code : "UNKNOWN",
						message:
							typeof payload.message === "string" ? payload.message : "Error",
					})
					break
			}
		} catch (err) {
			console.error("Malformed SSE event", err)
		}
	}
	return { items: events, remainder }
}
