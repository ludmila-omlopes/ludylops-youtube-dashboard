CREATE TABLE "google_risc_deliveries" (
	"jti" varchar(255) PRIMARY KEY NOT NULL,
	"event_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"issued_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"matched_account_count" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
