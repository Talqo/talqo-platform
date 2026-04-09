import type { S3Client, S3File } from "bun"

type UploadData = string | Uint8Array | ArrayBuffer | Blob | Response

type WriteOptions = { contentType?: string }

export interface FileEntry {
	key: string
	size: number
	lastModified: Date
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

	async list(prefix?: string): Promise<FileEntry[]> {
		const result = await this.s3.list(prefix ? { prefix } : undefined)
		return (
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
}
