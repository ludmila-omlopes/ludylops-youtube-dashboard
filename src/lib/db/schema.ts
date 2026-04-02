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

export const users = pgTable(
  "users",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    googleUserId: varchar("google_user_id", { length: 128 }),
    email: varchar("email", { length: 255 }),
    youtubeChannelId: varchar("youtube_channel_id", { length: 128 }).notNull(),
    youtubeDisplayName: varchar("youtube_display_name", { length: 255 }).notNull(),
    youtubeHandle: varchar("youtube_handle", { length: 255 }),
    avatarUrl: text("avatar_url"),
    isLinked: boolean("is_linked").default(false).notNull(),
    excludeFromRanking: boolean("exclude_from_ranking").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    youtubeChannelIdIdx: uniqueIndex("users_youtube_channel_id_idx").on(table.youtubeChannelId),
  }),
);

export const googleAccounts = pgTable(
  "google_accounts",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    googleUserId: varchar("google_user_id", { length: 128 }),
    email: varchar("email", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 255 }),
    avatarUrl: text("avatar_url"),
    activeViewerId: varchar("active_viewer_id", { length: 64 }).references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    googleUserIdIdx: uniqueIndex("google_accounts_google_user_id_idx").on(table.googleUserId),
    emailIdx: uniqueIndex("google_accounts_email_idx").on(table.email),
  }),
);

export const googleAccountViewers = pgTable(
  "google_account_viewers",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    googleAccountId: varchar("google_account_id", { length: 64 })
      .references(() => googleAccounts.id)
      .notNull(),
    viewerId: varchar("viewer_id", { length: 64 })
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    googleAccountViewerIdx: uniqueIndex("google_account_viewers_account_viewer_idx").on(
      table.googleAccountId,
      table.viewerId,
    ),
    viewerIdIdx: uniqueIndex("google_account_viewers_viewer_id_idx").on(table.viewerId),
  }),
);

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
    googleAccountId: varchar("google_account_id", { length: 64 })
      .references(() => googleAccounts.id)
      .notNull(),
    linkCode: varchar("link_code", { length: 32 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
  },
  (table) => ({
    googleAccountIdIdx: uniqueIndex("viewer_links_google_account_id_idx").on(table.googleAccountId),
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

export const bets = pgTable("bets", {
  id: varchar("id", { length: 64 }).primaryKey(),
  question: text("question").notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  winningOptionId: varchar("winning_option_id", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const betOptions = pgTable("bet_options", {
  id: varchar("id", { length: 64 }).primaryKey(),
  betId: varchar("bet_id", { length: 64 })
    .references(() => bets.id)
    .notNull(),
  label: varchar("label", { length: 255 }).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  poolAmount: integer("pool_amount").default(0).notNull(),
});

export const betEntries = pgTable(
  "bet_entries",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    betId: varchar("bet_id", { length: 64 })
      .references(() => bets.id)
      .notNull(),
    optionId: varchar("option_id", { length: 64 })
      .references(() => betOptions.id)
      .notNull(),
    viewerId: varchar("viewer_id", { length: 64 })
      .references(() => users.id)
      .notNull(),
    amount: integer("amount").notNull(),
    payoutAmount: integer("payout_amount"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    betViewerIdx: uniqueIndex("bet_entries_bet_viewer_idx").on(table.betId, table.viewerId),
  }),
);

export const gameSuggestions = pgTable("game_suggestions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  viewerId: varchar("viewer_id", { length: 64 })
    .references(() => users.id)
    .notNull(),
  slug: varchar("slug", { length: 160 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  linkUrl: text("link_url"),
  status: varchar("status", { length: 32 }).notNull(),
  totalVotes: integer("total_votes").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gameSuggestionBoosts = pgTable("game_suggestion_boosts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  suggestionId: varchar("suggestion_id", { length: 64 })
    .references(() => gameSuggestions.id)
    .notNull(),
  viewerId: varchar("viewer_id", { length: 64 })
    .references(() => users.id)
    .notNull(),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

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
