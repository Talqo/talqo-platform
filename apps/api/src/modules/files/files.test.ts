import { beforeEach, describe, expect, it } from "bun:test"
import { OpenAPIHono } from "@hono/zod-openapi"
import type { AppVariables } from "../../common/jwt"
import { logger } from "../../common/logger"
import { errorHandler } from "../../common/middleware/error-handler"
import { createFilesRouter } from "./files.routes"
import type { DirectoryListing, FileEntry } from "./files.service"
import { FilesService } from "./files.service"

const TEST_CLIENT_ID = "00000000-0000-0000-0000-000000000001"

// ─── In-memory FilesService ───────────────────────────────────────────────────
// Implements the same interface as FilesService without needing a real S3 client.

interface StoredEntry {
	size: number
	lastModified: Date
	contentType?: string
}

class FakeFilesService {
	readonly store = new Map<string, StoredEntry>()

	async upload(
		key: string,
		data: unknown,
		opts: { contentType?: string } = {},
	): Promise<void> {
		const size =
			data instanceof Uint8Array
				? data.byteLength
				: data instanceof Blob
					? data.size
					: 0
		this.store.set(key, {
			size,
			lastModified: new Date(),
			contentType: opts.contentType,
		})
	}

	read(_key: string) {
		return {}
	}

	async delete(key: string): Promise<void> {
		this.store.delete(key)
	}

	// Same grouping logic as FilesService.list() — keeps test behaviour in sync
	async list(prefix: string): Promise<DirectoryListing> {
		const files: FileEntry[] = []
		const dirSet = new Set<string>()

		for (const [k, v] of this.store) {
			if (!k.startsWith(prefix)) continue
			const relative = k.slice(prefix.length)
			if (relative === "") continue
			const slashIdx = relative.indexOf("/")
			if (slashIdx === -1) {
				files.push({ key: k, size: v.size, lastModified: v.lastModified })
			} else if (slashIdx === relative.length - 1) {
				dirSet.add(k)
			} else {
				dirSet.add(prefix + relative.slice(0, slashIdx + 1))
			}
		}

		return { files, directories: [...dirSet] }
	}

	async move(oldKey: string, newKey: string): Promise<void> {
		const entry = this.store.get(oldKey)
		if (entry) {
			this.store.set(newKey, entry)
			this.store.delete(oldKey)
		}
	}

	rename(oldKey: string, newKey: string): Promise<void> {
		return this.move(oldKey, newKey)
	}

	presign(key: string): string {
		return `https://minio.test/${key}?expires=900`
	}

	has(key: string): boolean {
		return this.store.has(key)
	}
}

// ─── Test app factory ─────────────────────────────────────────────────────────

function buildApp(service: FakeFilesService) {
	const app = new OpenAPIHono<{ Variables: AppVariables }>()
	app.use("/*", async (c, next) => {
		c.set("logger", logger.withContext({ requestId: crypto.randomUUID() }))
		c.set("clientId" as never, TEST_CLIENT_ID)
		await next()
	})
	app.onError(errorHandler)
	return app.route(
		"/client/me/files",
		createFilesRouter(service as unknown as FilesService),
	)
}

// ─── FilesService.list() — directory simulation logic ─────────────────────────

describe("FilesService.list()", () => {
	let service: FilesService

	beforeEach(() => {
		// Minimal fake S3Client — list() is the only method exercised here
		const fakeS3 = {
			file: () => ({}),
			delete: async () => {},
			list: async ({ prefix }: { prefix?: string } = {}) => ({
				contents: [
					{
						key: `${TEST_CLIENT_ID}/readme.txt`,
						size: 10,
						lastModified: "2024-01-01T00:00:00Z",
					},
					{
						key: `${TEST_CLIENT_ID}/docs/report.pdf`,
						size: 200,
						lastModified: "2024-01-02T00:00:00Z",
					},
					{
						key: `${TEST_CLIENT_ID}/docs/notes.txt`,
						size: 50,
						lastModified: "2024-01-03T00:00:00Z",
					},
					{
						key: `${TEST_CLIENT_ID}/docs/sub/deep.txt`,
						size: 30,
						lastModified: "2024-01-04T00:00:00Z",
					},
					// Explicit directory marker
					{
						key: `${TEST_CLIENT_ID}/docs/`,
						size: 0,
						lastModified: "2024-01-01T00:00:00Z",
					},
				].filter((e) => !prefix || e.key.startsWith(prefix)),
			}),
		}
		service = new FilesService(
			fakeS3 as unknown as ConstructorParameters<typeof FilesService>[0],
		)
	})

	it("returns direct files at the root prefix", async () => {
		const { files } = await service.list(`${TEST_CLIENT_ID}/`)
		const keys = files.map((f) => f.key)
		expect(keys).toContain(`${TEST_CLIENT_ID}/readme.txt`)
	})

	it("does not expose files from subdirectories as top-level files", async () => {
		const { files } = await service.list(`${TEST_CLIENT_ID}/`)
		const keys = files.map((f) => f.key)
		expect(keys).not.toContain(`${TEST_CLIENT_ID}/docs/report.pdf`)
		expect(keys).not.toContain(`${TEST_CLIENT_ID}/docs/notes.txt`)
	})

	it("groups subdirectory contents as a single directory entry", async () => {
		const { directories } = await service.list(`${TEST_CLIENT_ID}/`)
		expect(directories).toContain(`${TEST_CLIENT_ID}/docs/`)
	})

	it("lists files inside a subdirectory when given a deeper prefix", async () => {
		const { files, directories } = await service.list(`${TEST_CLIENT_ID}/docs/`)
		const keys = files.map((f) => f.key)
		expect(keys).toContain(`${TEST_CLIENT_ID}/docs/report.pdf`)
		expect(keys).toContain(`${TEST_CLIENT_ID}/docs/notes.txt`)
		// The deeper subdir should appear as a directory, not as a file
		expect(directories).toContain(`${TEST_CLIENT_ID}/docs/sub/`)
		expect(keys).not.toContain(`${TEST_CLIENT_ID}/docs/sub/deep.txt`)
	})

	it("returns empty arrays when the prefix matches nothing", async () => {
		const { files, directories } = await service.list(
			`${TEST_CLIENT_ID}/nonexistent/`,
		)
		expect(files).toHaveLength(0)
		expect(directories).toHaveLength(0)
	})
})

// ─── GET /client/me/files — list directory ────────────────────────────────────

describe("GET /client/me/files", () => {
	let app: ReturnType<typeof buildApp>
	let service: FakeFilesService

	beforeEach(async () => {
		service = new FakeFilesService()
		app = buildApp(service)
		await service.upload(
			`${TEST_CLIENT_ID}/readme.txt`,
			new TextEncoder().encode("hi"),
		)
		await service.upload(
			`${TEST_CLIENT_ID}/docs/report.pdf`,
			new TextEncoder().encode("pdf"),
		)
	})

	it("returns 200 with entries at root", async () => {
		const res = await app.fetch(new Request("http://localhost/client/me/files"))
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			success: boolean
			data: { entries: unknown[] }
		}
		expect(body.success).toBe(true)
		expect(Array.isArray(body.data.entries)).toBe(true)
	})

	it("includes direct files and directory entries at root level", async () => {
		const res = await app.fetch(new Request("http://localhost/client/me/files"))
		const body = (await res.json()) as {
			data: { entries: Array<{ name: string; type: string }> }
		}
		const names = body.data.entries.map((e) => e.name)
		expect(names).toContain("readme.txt")
		expect(names).toContain("docs/")
	})

	it("lists files inside a subdirectory", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files?path=/docs"),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			data: { entries: Array<{ name: string }> }
		}
		const names = body.data.entries.map((e) => e.name)
		expect(names).toContain("docs/report.pdf")
	})

	it("returns 422 for path traversal", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files?path=/../etc"),
		)
		expect(res.status).toBe(422)
	})
})

// ─── POST /client/me/files — upload ──────────────────────────────────────────

describe("POST /client/me/files", () => {
	let app: ReturnType<typeof buildApp>
	let service: FakeFilesService

	beforeEach(() => {
		service = new FakeFilesService()
		app = buildApp(service)
	})

	it("returns 201 and stores the file at the correct S3 key", async () => {
		const formData = new FormData()
		formData.append(
			"file",
			new File(["hello"], "test.txt", { type: "text/plain" }),
		)

		const res = await app.fetch(
			new Request("http://localhost/client/me/files", {
				method: "POST",
				body: formData,
			}),
		)
		expect(res.status).toBe(201)
		const body = (await res.json()) as {
			success: boolean
			data: { path: string }
		}
		expect(body.success).toBe(true)
		expect(body.data.path).toBe("/test.txt")
		expect(service.has(`${TEST_CLIENT_ID}/test.txt`)).toBe(true)
	})

	it("uploads into a subdirectory when path query param is given", async () => {
		const formData = new FormData()
		formData.append(
			"file",
			new File(["pdf"], "doc.pdf", { type: "application/pdf" }),
		)

		const res = await app.fetch(
			new Request("http://localhost/client/me/files?path=/docs", {
				method: "POST",
				body: formData,
			}),
		)
		expect(res.status).toBe(201)
		expect(service.has(`${TEST_CLIENT_ID}/docs/doc.pdf`)).toBe(true)
	})

	it("returns 422 when the file field is missing", async () => {
		const formData = new FormData()
		formData.append("other", "value")

		const res = await app.fetch(
			new Request("http://localhost/client/me/files", {
				method: "POST",
				body: formData,
			}),
		)
		expect(res.status).toBe(422)
	})

	it("returns 422 for path traversal", async () => {
		const formData = new FormData()
		formData.append("file", new File(["x"], "x.txt"))

		const res = await app.fetch(
			new Request("http://localhost/client/me/files?path=/../etc", {
				method: "POST",
				body: formData,
			}),
		)
		expect(res.status).toBe(422)
	})
})

// ─── POST /client/me/files/presign ───────────────────────────────────────────

describe("POST /client/me/files/presign", () => {
	let app: ReturnType<typeof buildApp>

	beforeEach(() => {
		app = buildApp(new FakeFilesService())
	})

	it("returns 200 with a presigned URL containing the file key", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files/presign", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ path: "/docs/file.pdf" }),
			}),
		)
		expect(res.status).toBe(200)
		const body = (await res.json()) as {
			success: boolean
			data: { url: string }
		}
		expect(body.success).toBe(true)
		expect(typeof body.data.url).toBe("string")
		expect(body.data.url).toContain("file.pdf")
	})

	it("returns 422 for a directory path", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files/presign", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ path: "/docs/" }),
			}),
		)
		expect(res.status).toBe(422)
	})

	it("returns 422 for path traversal", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files/presign", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ path: "/../etc/passwd" }),
			}),
		)
		expect(res.status).toBe(422)
	})
})

// ─── DELETE /client/me/files ──────────────────────────────────────────────────

describe("DELETE /client/me/files", () => {
	let app: ReturnType<typeof buildApp>
	let service: FakeFilesService

	beforeEach(async () => {
		service = new FakeFilesService()
		app = buildApp(service)
		await service.upload(
			`${TEST_CLIENT_ID}/readme.txt`,
			new TextEncoder().encode("hi"),
		)
	})

	it("returns 200 and removes the file from the store", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files?path=/readme.txt", {
				method: "DELETE",
			}),
		)
		expect(res.status).toBe(200)
		expect(service.has(`${TEST_CLIENT_ID}/readme.txt`)).toBe(false)
	})

	it("returns 422 when trying to delete root", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files?path=/", {
				method: "DELETE",
			}),
		)
		expect(res.status).toBe(422)
	})

	it("returns 422 for path traversal", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files?path=/../etc", {
				method: "DELETE",
			}),
		)
		expect(res.status).toBe(422)
	})
})

// ─── POST /client/me/files/mkdir ─────────────────────────────────────────────

describe("POST /client/me/files/mkdir", () => {
	let app: ReturnType<typeof buildApp>
	let service: FakeFilesService

	beforeEach(() => {
		service = new FakeFilesService()
		app = buildApp(service)
	})

	it("returns 201 and creates a zero-byte directory marker", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files/mkdir", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ path: "/documents" }),
			}),
		)
		expect(res.status).toBe(201)
		expect(service.has(`${TEST_CLIENT_ID}/documents/`)).toBe(true)
		expect(service.store.get(`${TEST_CLIENT_ID}/documents/`)?.size).toBe(0)
	})

	it("returns 422 for root path", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files/mkdir", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ path: "/" }),
			}),
		)
		expect(res.status).toBe(422)
	})

	it("returns 422 for path traversal", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files/mkdir", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ path: "/../etc" }),
			}),
		)
		expect(res.status).toBe(422)
	})
})

// ─── POST /client/me/files/move ──────────────────────────────────────────────

describe("POST /client/me/files/move", () => {
	let app: ReturnType<typeof buildApp>
	let service: FakeFilesService

	beforeEach(async () => {
		service = new FakeFilesService()
		app = buildApp(service)
		await service.upload(
			`${TEST_CLIENT_ID}/old.txt`,
			new TextEncoder().encode("content"),
		)
	})

	it("returns 200 and relocates the file to the new key", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files/move", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ from: "/old.txt", to: "/new.txt" }),
			}),
		)
		expect(res.status).toBe(200)
		expect(service.has(`${TEST_CLIENT_ID}/old.txt`)).toBe(false)
		expect(service.has(`${TEST_CLIENT_ID}/new.txt`)).toBe(true)
	})

	it("returns 422 when the source is a directory path", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files/move", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ from: "/somedir/", to: "/otherdir" }),
			}),
		)
		expect(res.status).toBe(422)
	})

	it("returns 422 for path traversal in from", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files/move", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ from: "/../etc/passwd", to: "/stolen.txt" }),
			}),
		)
		expect(res.status).toBe(422)
	})

	it("returns 422 for path traversal in to", async () => {
		const res = await app.fetch(
			new Request("http://localhost/client/me/files/move", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ from: "/old.txt", to: "/../etc/stolen" }),
			}),
		)
		expect(res.status).toBe(422)
	})
})
