-- Add soft-delete columns to admin_users that were missing from initial migration
ALTER TABLE "admin_users" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;
ALTER TABLE "admin_users" ADD COLUMN "deleted_at" timestamp with time zone;
