ALTER TABLE "google_accounts" ADD COLUMN "cross_account_protection_state" varchar(32) DEFAULT 'ok' NOT NULL;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD COLUMN "cross_account_protection_event" varchar(255);--> statement-breakpoint
ALTER TABLE "google_accounts" ADD COLUMN "cross_account_protection_reason" varchar(255);--> statement-breakpoint
ALTER TABLE "google_accounts" ADD COLUMN "cross_account_protection_updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD COLUMN "sessions_revoked_at" timestamp with time zone;