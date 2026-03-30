import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  googleUserId: varchar("google_user_id", { length: 128 }),
  email: varchar("email", { length: 255 }),
  youtubeChannelId: varchar("youtube_channel_id", { length: 128 }),
  youtubeDisplayName: varchar("youtube_display_name", { length: 255 }).notNull(),
  avatarUrl: text("avatar_url"),
  isLinked: boolean("is_linked").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const viewerBalances = pgTable("viewer_balances", {
  viewerId: varchar("viewer_id", { length: 64 })
    .primaryKey()
    .references(() => users.id),
  currentBalance: integer("current_balance").default(0).notNull(),
  lifetimeEarned: integer("lifetime_earned").default(0).notNull(),
  lifetimeSpent: integer("lifetime_spent").default(0).notNull(),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
});

export const viewerLinks = pgTable(
  "viewer_links",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("user_id", { length: 64 })
      .references(() => users.id)
      .notNull(),
    linkCode: varchar("link_code", { length: 32 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: uniqueIndex("viewer_links_user_id_idx").on(table.userId),
    codeIdx: uniqueIndex("viewer_links_code_idx").on(table.linkCode),
  }),
);

export const catalogItems = pgTable(
  "catalog_items",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    slug: varchar("slug", { length: 128 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    type: varchar("type", { length: 64 }).notNull(),
    cost: integer("cost").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    globalCooldownSeconds: integer("global_cooldown_seconds").default(0).notNull(),
    viewerCooldownSeconds: integer("viewer_cooldown_seconds").default(0).notNull(),
    stock: integer("stock"),
    previewImageUrl: text("preview_image_url"),
    accentColor: varchar("accent_color", { length: 16 }).default("#b4ff39").notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    streamerbotActionRef: varchar("streamerbot_action_ref", { length: 255 }).notNull(),
    streamerbotArgsTemplate: jsonb("streamerbot_args_template").default({}).notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("catalog_items_slug_idx").on(table.slug),
  }),
);

export const pointLedger = pgTable(
  "point_ledger",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    viewerId: varchar("viewer_id", { length: 64 })
      .references(() => users.id)
      .notNull(),
    kind: varchar("kind", { length: 64 }).notNull(),
    amount: integer("amount").notNull(),
    source: varchar("source", { length: 64 }).notNull(),
    externalEventId: varchar("external_event_id", { length: 128 }),
    metadata: jsonb("metadata").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    eventIdx: uniqueIndex("point_ledger_external_event_idx").on(table.externalEventId),
  }),
);

export const redemptions = pgTable("redemptions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  viewerId: varchar("viewer_id", { length: 64 })
    .references(() => users.id)
    .notNull(),
  catalogItemId: varchar("catalog_item_id", { length: 64 })
    .references(() => catalogItems.id)
    .notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  costAtPurchase: integer("cost_at_purchase").notNull(),
  requestSource: varchar("request_source", { length: 32 }).default("web").notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
  bridgeAttemptCount: integer("bridge_attempt_count").default(0).notNull(),
  claimedByBridgeId: varchar("claimed_by_bridge_id", { length: 64 }),
  queuedAt: timestamp("queued_at", { withTimezone: true }).defaultNow().notNull(),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
});

export const bridgeClients = pgTable(
  "bridge_clients",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    machineKey: varchar("machine_key", { length: 128 }).notNull(),
    label: varchar("label", { length: 255 }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    machineKeyIdx: uniqueIndex("bridge_clients_machine_key_idx").on(table.machineKey),
  }),
);

export const streamerbotEventLog = pgTable(
  "streamerbot_event_log",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    eventId: varchar("event_id", { length: 128 }).notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    viewerExternalId: varchar("viewer_external_id", { length: 128 }),
    payload: jsonb("payload").default({}).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    signatureValid: boolean("signature_valid").default(true).notNull(),
  },
  (table) => ({
    eventIdIdx: uniqueIndex("streamerbot_event_id_idx").on(table.eventId),
  }),
);

export const streamerbotBalanceSnapshots = pgTable("streamerbot_balance_snapshots", {
  id: varchar("id", { length: 64 }).primaryKey(),
  viewerId: varchar("viewer_id", { length: 64 })
    .references(() => users.id)
    .notNull(),
  balance: integer("balance").notNull(),
  sourceEventId: varchar("source_event_id", { length: 128 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
