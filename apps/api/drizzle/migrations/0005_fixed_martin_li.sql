CREATE TABLE "pending_registrations" (
	"token" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "pending_registrations_email_unique" UNIQUE("email")
);
