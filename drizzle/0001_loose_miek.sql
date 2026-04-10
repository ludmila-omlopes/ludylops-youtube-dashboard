CREATE TABLE "streamerbot_counters" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"last_reset_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
