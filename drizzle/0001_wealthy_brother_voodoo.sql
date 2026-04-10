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
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_viewer_id_users_id_fk" FOREIGN KEY ("created_by_viewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quotes_quote_number_idx" ON "quotes" USING btree ("quote_number");