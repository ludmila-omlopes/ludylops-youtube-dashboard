CREATE TABLE "quote_overlay_state" (
	"slot" varchar(32) PRIMARY KEY NOT NULL,
	"overlay_id" varchar(64) NOT NULL,
	"quote_number" integer NOT NULL,
	"quote_body" text NOT NULL,
	"requested_by_viewer_id" varchar(64) NOT NULL,
	"requested_by_display_name" varchar(255) NOT NULL,
	"requested_by_youtube_handle" varchar(255),
	"source" varchar(64) DEFAULT 'streamerbot_chat' NOT NULL,
	"cost" integer NOT NULL,
	"activated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"quote_number" integer NOT NULL,
	"body" text NOT NULL,
	"created_by_viewer_id" varchar(64) NOT NULL,
	"created_by_display_name" varchar(255) NOT NULL,
	"created_by_youtube_handle" varchar(255),
	"source" varchar(64) DEFAULT 'streamerbot_chat' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streamerbot_counters" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"last_reset_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "quote_overlay_state" ADD CONSTRAINT "quote_overlay_state_requested_by_viewer_id_users_id_fk" FOREIGN KEY ("requested_by_viewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_viewer_id_users_id_fk" FOREIGN KEY ("created_by_viewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_quote_number_idx" ON "quotes" USING btree ("quote_number");