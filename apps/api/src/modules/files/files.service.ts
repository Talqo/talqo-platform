import type { S3Client, S3File } from "bun"

type UploadData = string | Uint8Array | ArrayBuffer | Blob | Response
type WriteOptions = { contentType?: string }

export interface FileEntry {
	key: string
	size: number
	lastModified: Date
}

export interface DirectoryListing {
	files: FileEntry[]
	/** S3 key prefixes representing subdirectories at this level */
	directories: string[]
}

export class FilesService {
	constructor(private readonly s3: S3Client) {}

	async upload(
		key: string,
		data: UploadData,
		options: WriteOptions = {},
	): Promise<void> {
		await this.s3
			.file(key)
			.write(
				data,
				options.contentType ? { type: options.contentType } : undefined,
			)
	}

	// Returns a lazy S3File reference — caller decides how to read (.text(), .stream(), etc.)
	read(key: string): S3File {
		return this.s3.file(key)
	}

	delete(key: string): Promise<void> {
		return this.s3.delete(key)
	}

	/**
	 * List one level of a "directory" by prefix.
	 * S3 is flat — we simulate directories client-side by grouping keys on the first `/`
	 * after the prefix. Zero-byte keys ending in `/` are treated as directory markers.
	 */
	async list(prefix: string): Promise<DirectoryListing> {
		const result = await this.s3.list({ prefix })

		const allEntries = (
			(result.contents ?? []) as {
				key: string
				size: number
				lastModified: string
			}[]
		).map(({ key, size, lastModified }) => ({
			key,
			size,
			lastModified: new Date(lastModified),
		}))

		const files: FileEntry[] = []
		const dirSet = new Set<string>()

		for (const entry of allEntries) {
			const relative = entry.key.slice(prefix.length)

			// Skip the prefix object itself (can occur when prefix is also an object key)
			if (relative === "") continue

			const slashIdx = relative.indexOf("/")

			if (slashIdx === -1) {
				// Direct file under this prefix
				files.push(entry)
			} else if (slashIdx === relative.length - 1) {
				// Explicit directory marker (zero-byte object ending in `/`)
				dirSet.add(entry.key)
			} else {
				// File inside a subdirectory — record the immediate subdir
				dirSet.add(prefix + relative.slice(0, slashIdx + 1))
			}
		}

		return { files, directories: [...dirSet] }
	}

	// S3 PUT is idempotent — uploading to the same key replaces the object
	update(
		key: string,
		data: UploadData,
		options: WriteOptions = {},
	): Promise<void> {
		return this.upload(key, data, options)
	}

	// S3 doesn't directly support move, so we create a new file and delete the old one
	async move(oldKey: string, newKey: string): Promise<void> {
		await this.s3.file(newKey).write(this.s3.file(oldKey))
		await this.s3.delete(oldKey)
	}

	// Rename is basically just a move
	rename(oldKey: string, newKey: string): Promise<void> {
		return this.move(oldKey, newKey)
	}

	// Returns a presigned URL valid for `expiresIn` seconds (default: 15 minutes)
	presign(key: string, expiresIn = 900): string {
		return this.s3.file(key).presign({ expiresIn })
	}
}
