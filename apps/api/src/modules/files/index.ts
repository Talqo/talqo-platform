import { S3Client } from "bun"
import { config } from "@/common/config"
import { FilesService } from "./files.service"

const s3Client = new S3Client({
	accessKeyId: config.S3_ACCESS_KEY_ID,
	secretAccessKey: config.S3_SECRET_ACCESS_KEY,
	endpoint: config.S3_ENDPOINT,
	bucket: config.S3_BUCKET,
	// MinIO ignores region; any non-empty value satisfies the AWS signing algorithm
	region: "us-east-1",
})

export const filesService = new FilesService(s3Client)

export { createFilesRouter } from "./files.routes"

export type { DirectoryListing, FileEntry } from "./files.service"
