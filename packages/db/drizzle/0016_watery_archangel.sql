CREATE TYPE "public"."usage_type" AS ENUM('message', 'embedding');--> statement-breakpoint
ALTER TABLE "usage_records" ALTER COLUMN "type" SET DEFAULT 'message'::"public"."usage_type";--> statement-breakpoint
ALTER TABLE "usage_records" ALTER COLUMN "type" SET DATA TYPE "public"."usage_type" USING "type"::"public"."usage_type";
