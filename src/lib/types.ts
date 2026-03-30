export type CatalogItemType =
  | "onscreen_text"
  | "play_sound"
  | "show_image"
  | "overlay_scene_trigger"
  | "generic_streamerbot_action";

export type LedgerKind =
  | "presence_tick"
  | "chat_bonus"
  | "manual_adjustment"
  | "redemption_debit"
  | "redemption_refund"
  | "snapshot_reconcile";

export type RedemptionStatus =
  | "queued"
  | "executing"
  | "completed"
  | "failed"
  | "cancelled";

export type StreamerbotEventType =
  | "presence_tick"
  | "chat_bonus"
  | "manual_adjustment"
  | "link_code_seen"
  | "balance_snapshot";

export interface ViewerRecord {
  id: string;
  googleUserId: string | null;
  email: string | null;
  youtubeChannelId: string | null;
  youtubeDisplayName: string;
  avatarUrl: string | null;
  isLinked: boolean;
  createdAt: string;
}

export interface ViewerBalanceRecord {
  viewerId: string;
  currentBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastSyncedAt: string;
}

export interface CatalogItemRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: CatalogItemType;
  cost: number;
  isActive: boolean;
  globalCooldownSeconds: number;
  viewerCooldownSeconds: number;
  stock: number | null;
  previewImageUrl: string | null;
  accentColor: string;
  isFeatured: boolean;
  streamerbotActionRef: string;
  streamerbotArgsTemplate: Record<string, unknown>;
}

export interface RedemptionRecord {
  id: string;
  viewerId: string;
  catalogItemId: string;
  status: RedemptionStatus;
  costAtPurchase: number;
  requestSource: string;
  idempotencyKey: string;
  bridgeAttemptCount: number;
  claimedByBridgeId: string | null;
  queuedAt: string;
  executedAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
}

export interface LedgerEntryRecord {
  id: string;
  viewerId: string;
  kind: LedgerKind;
  amount: number;
  source: string;
  externalEventId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface BridgeClientRecord {
  id: string;
  machineKey: string;
  label: string;
  lastSeenAt: string;
}

export interface LinkCodeRecord {
  id: string;
  code: string;
  userId: string;
  expiresAt: string;
  claimedAt: string | null;
}

export interface BalanceSnapshotRecord {
  viewerId: string;
  balance: number;
  sourceEventId: string;
  createdAt: string;
}
