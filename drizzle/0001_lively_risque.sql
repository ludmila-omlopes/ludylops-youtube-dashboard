CREATE TABLE "product_recommendations" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"slug" varchar(160) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category" varchar(32) NOT NULL,
	"context" text NOT NULL,
	"image_url" text NOT NULL,
	"href" text NOT NULL,
	"store_label" varchar(120) NOT NULL,
	"link_kind" varchar(32) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "product_recommendations_slug_idx" ON "product_recommendations" USING btree ("slug");
