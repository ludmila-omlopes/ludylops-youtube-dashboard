CREATE TABLE "bet_entries" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"bet_id" varchar(64) NOT NULL,
	"option_id" varchar(64) NOT NULL,
	"viewer_id" varchar(64) NOT NULL,
	"amount" integer NOT NULL,
	"payout_amount" integer,
	"settled_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bet_options" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"bet_id" varchar(64) NOT NULL,
	"label" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"pool_amount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bets" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"question" text NOT NULL,
	"status" varchar(32) NOT NULL,
	"opened_at" timestamp with time zone,
	"closes_at" timestamp with time zone NOT NULL,
	"locked_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"winning_option_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bridge_clients" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"machine_key" varchar(128) NOT NULL,
	"label" varchar(255) NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"slug" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"type" varchar(64) NOT NULL,
	"cost" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"global_cooldown_seconds" integer DEFAULT 0 NOT NULL,
	"viewer_cooldown_seconds" integer DEFAULT 0 NOT NULL,
	"stock" integer,
	"preview_image_url" text,
	"accent_color" varchar(16) DEFAULT '#b4ff39' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"streamerbot_action_ref" varchar(255) NOT NULL,
	"streamerbot_args_template" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_suggestion_boosts" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"suggestion_id" varchar(64) NOT NULL,
	"viewer_id" varchar(64) NOT NULL,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_suggestions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"viewer_id" varchar(64) NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"link_url" text,
	"status" varchar(32) NOT NULL,
	"total_votes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_account_viewers" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"google_account_id" varchar(64) NOT NULL,
	"viewer_id" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_accounts" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"google_user_id" varchar(128),
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255),
	"avatar_url" text,
	"active_viewer_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_ledger" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"viewer_id" varchar(64) NOT NULL,
	"kind" varchar(64) NOT NULL,
	"amount" integer NOT NULL,
	"source" varchar(64) NOT NULL,
	"external_event_id" varchar(128),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemptions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"viewer_id" varchar(64) NOT NULL,
	"catalog_item_id" varchar(64) NOT NULL,
	"status" varchar(32) NOT NULL,
	"cost_at_purchase" integer NOT NULL,
	"request_source" varchar(32) DEFAULT 'web' NOT NULL,
	"idempotency_key" varchar(128) NOT NULL,
	"bridge_attempt_count" integer DEFAULT 0 NOT NULL,
	"claimed_by_bridge_id" varchar(64),
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"executed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE "streamerbot_event_log" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"event_id" varchar(128) NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"viewer_external_id" varchar(128),
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"signature_valid" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"google_user_id" varchar(128),
	"email" varchar(255),
	"youtube_channel_id" varchar(128) NOT NULL,
	"youtube_display_name" varchar(255) NOT NULL,
	"youtube_handle" varchar(255),
	"avatar_url" text,
	"is_linked" boolean DEFAULT false NOT NULL,
	"exclude_from_ranking" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viewer_balances" (
	"viewer_id" varchar(64) PRIMARY KEY NOT NULL,
	"current_balance" integer DEFAULT 0 NOT NULL,
	"lifetime_earned" integer DEFAULT 0 NOT NULL,
	"lifetime_spent" integer DEFAULT 0 NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viewer_links" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"google_account_id" varchar(64) NOT NULL,
	"link_code" varchar(32) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bet_entries" ADD CONSTRAINT "bet_entries_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bet_entries" ADD CONSTRAINT "bet_entries_option_id_bet_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."bet_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bet_entries" ADD CONSTRAINT "bet_entries_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bet_options" ADD CONSTRAINT "bet_options_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_suggestion_boosts" ADD CONSTRAINT "game_suggestion_boosts_suggestion_id_game_suggestions_id_fk" FOREIGN KEY ("suggestion_id") REFERENCES "public"."game_suggestions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_suggestion_boosts" ADD CONSTRAINT "game_suggestion_boosts_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_suggestions" ADD CONSTRAINT "game_suggestions_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_account_viewers" ADD CONSTRAINT "google_account_viewers_google_account_id_google_accounts_id_fk" FOREIGN KEY ("google_account_id") REFERENCES "public"."google_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_account_viewers" ADD CONSTRAINT "google_account_viewers_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_active_viewer_id_users_id_fk" FOREIGN KEY ("active_viewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemptions" ADD CONSTRAINT "redemptions_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewer_balances" ADD CONSTRAINT "viewer_balances_viewer_id_users_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewer_links" ADD CONSTRAINT "viewer_links_google_account_id_google_accounts_id_fk" FOREIGN KEY ("google_account_id") REFERENCES "public"."google_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bet_entries_bet_viewer_idx" ON "bet_entries" USING btree ("bet_id","viewer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bridge_clients_machine_key_idx" ON "bridge_clients" USING btree ("machine_key");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_items_slug_idx" ON "catalog_items" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "google_account_viewers_account_viewer_idx" ON "google_account_viewers" USING btree ("google_account_id","viewer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "google_account_viewers_viewer_id_idx" ON "google_account_viewers" USING btree ("viewer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "google_accounts_google_user_id_idx" ON "google_accounts" USING btree ("google_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "google_accounts_email_idx" ON "google_accounts" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "point_ledger_external_event_idx" ON "point_ledger" USING btree ("external_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "streamerbot_event_id_idx" ON "streamerbot_event_log" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_youtube_channel_id_idx" ON "users" USING btree ("youtube_channel_id");--> statement-breakpoint
CREATE UNIQUE INDEX "viewer_links_google_account_id_idx" ON "viewer_links" USING btree ("google_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "viewer_links_code_idx" ON "viewer_links" USING btree ("link_code");