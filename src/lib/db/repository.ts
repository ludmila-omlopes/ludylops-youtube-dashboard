import { randomUUID } from "node:crypto";

import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";

import {
  calculateBetPayouts,
  evaluateBetLifecycleAction,
  evaluateBetPlacement,
  shouldRefundBetOnResolve,
} from "@/lib/bets/service";
import { getDb } from "@/lib/db/client";
import {
  betEntries,
  betOptions,
  bets,
  bridgeClients,
  catalogItems,
  gameSuggestionBoosts,
  gameSuggestions,
  googleAccounts,
  googleAccountViewers,
  pointLedger,
  quotes,
  productRecommendations,
  redemptions,
  streamerbotCounters,
  streamerbotEventLog,
  users,
  viewerBalances,
} from "@/lib/db/schema";
import {
  demoBalances,
  demoBetEntries,
  demoBetOptions,
  demoBetRecords,
  demoBridgeClients,
  demoCatalog,
  demoGameSuggestionBoosts,
  demoGameSuggestions,
  demoGoogleAccounts,
  demoGoogleAccountViewers,
  demoLedger,
  demoQuotes,
  demoProductRecommendations,
  demoRedemptions,
  demoViewers,
} from "@/lib/demo-data";
import { adminEmails, isDemoMode } from "@/lib/env";
import { GAME_SUGGESTION_CREATION_COST } from "@/lib/game-suggestions/constants";
import {
  eventRequiresActiveLivestream,
  isStreamerbotLivestreamActive,
} from "@/lib/streamerbot/live-status";
import { normalizeYoutubeHandle } from "@/lib/youtube/identity";
import { evaluateRedeemability } from "@/lib/redemptions/service";
import {
  BetEntryRecord,
  BetOptionRecord,
  BetRecord,
  BetWithOptionsRecord,
  BetViewerPositionRecord,
  BridgeClientRecord,
  CatalogItemRecord,
  GameSuggestionBoostRecord,
  GameSuggestionRecord,
  GameSuggestionWithMeta,
  GoogleAccountRecord,
  GoogleAccountViewerRecord,
  LedgerEntryRecord,
  QuoteRecord,
  ProductRecommendationRecord,
  RedemptionRecord,
  StreamerbotCounterRecord,
  ViewerChannelOptionRecord,
  ViewerBalanceRecord,
  ViewerRecord,
} from "@/lib/types";
import { slugify } from "@/lib/utils";

function buildSyntheticYoutubeChannelId(input: { googleUserId: string | null; email: string }) {
  const base = input.googleUserId ?? input.email.toLowerCase();
  return `session:${base}`.slice(0, 128);
}

function shouldExcludeFromRanking(email: string | null) {
  return !email || adminEmails.has(email.toLowerCase());
}

const DEFAULT_DEATH_COUNTER_KEY = "death_count";
const DEFAULT_DEATH_COUNTER_LABEL = "mortes";

type StreamerbotCounterCommandAction = "increment" | "get" | "reset";

function buildDefaultStreamerbotCounter(counterKey: string, now = new Date()): StreamerbotCounterRecord {
  return {
    key: counterKey,
    value: 0,
    lastResetAt: null,
    updatedAt: now.toISOString(),
    metadata: {},
  };
}

function normalizeStreamerbotCounterLabel(input: {
  counterKey: string;
  counterLabel?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const providedLabel = input.counterLabel?.trim();
  if (providedLabel) {
    return providedLabel;
  }

  const metadataLabel = input.metadata?.counterLabel;
  if (typeof metadataLabel === "string" && metadataLabel.trim()) {
    return metadataLabel.trim();
  }

  return input.counterKey.replace(/[_-]+/g, " ").trim();
}

type DemoStore = {
  viewers: ViewerRecord[];
  googleAccounts: GoogleAccountRecord[];
  googleAccountViewers: GoogleAccountViewerRecord[];
  balances: ViewerBalanceRecord[];
  catalog: CatalogItemRecord[];
  ledger: LedgerEntryRecord[];
  quotes: QuoteRecord[];
  redemptions: RedemptionRecord[];
  bets: BetRecord[];
  betOptions: BetOptionRecord[];
  betEntries: BetEntryRecord[];
  gameSuggestions: GameSuggestionRecord[];
  gameSuggestionBoosts: GameSuggestionBoostRecord[];
  productRecommendations: ProductRecommendationRecord[];
  bridgeClients: BridgeClientRecord[];
  streamerbotCounters: StreamerbotCounterRecord[];
};

declare global {
  var __lojaDemoStore: DemoStore | undefined;
}

function getDemoStore(): DemoStore {
  if (!globalThis.__lojaDemoStore) {
    globalThis.__lojaDemoStore = {
      viewers: structuredClone(demoViewers),
      googleAccounts: structuredClone(demoGoogleAccounts),
      googleAccountViewers: structuredClone(demoGoogleAccountViewers),
      balances: structuredClone(demoBalances),
      catalog: structuredClone(demoCatalog),
      ledger: structuredClone(demoLedger),
      quotes: structuredClone(demoQuotes),
      redemptions: structuredClone(demoRedemptions),
      bets: structuredClone(demoBetRecords),
      betOptions: structuredClone(demoBetOptions),
      betEntries: structuredClone(demoBetEntries),
      gameSuggestions: structuredClone(demoGameSuggestions),
      gameSuggestionBoosts: structuredClone(demoGameSuggestionBoosts),
      productRecommendations: structuredClone(demoProductRecommendations),
      bridgeClients: structuredClone(demoBridgeClients),
      streamerbotCounters: [],
    };
  }

  return globalThis.__lojaDemoStore;
}

function getBalance(store: DemoStore, viewerId: string) {
  const found = store.balances.find((entry) => entry.viewerId === viewerId);
  if (found) {
    return found;
  }

  const created: ViewerBalanceRecord = {
    viewerId,
    currentBalance: 0,
    lifetimeEarned: 0,
    lifetimeSpent: 0,
    lastSyncedAt: new Date().toISOString(),
  };
  store.balances.push(created);
  return created;
}

function createLedgerEntry(
  store: DemoStore,
  entry: Omit<LedgerEntryRecord, "id" | "createdAt"> & { createdAt?: string },
) {
  const created: LedgerEntryRecord = {
    id: randomUUID(),
    createdAt: entry.createdAt ?? new Date().toISOString(),
    ...entry,
  };
  store.ledger.unshift(created);
  return created;
}

function getDemoStreamerbotCounter(store: DemoStore, counterKey: string) {
  const found = store.streamerbotCounters.find((entry) => entry.key === counterKey);
  if (found) {
    return found;
  }

  const created = buildDefaultStreamerbotCounter(counterKey);
  store.streamerbotCounters.unshift(created);
  return created;
}

function serializeStreamerbotCounter(
  row: typeof streamerbotCounters.$inferSelect,
): StreamerbotCounterRecord {
  return {
    key: row.key,
    value: row.value,
    lastResetAt: row.lastResetAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    metadata: row.metadata as Record<string, unknown>,
  };
}

type CounterDbLike = Pick<NonNullable<ReturnType<typeof getDb>>, "insert" | "select" | "update">;

type StreamerbotCounterCommandResult = {
  mode: "demo" | "database";
  action: StreamerbotCounterCommandAction;
  count: number;
  counter: StreamerbotCounterRecord;
  replyMessage: string;
};

async function ensureStreamerbotCounterRow(db: CounterDbLike, counterKey: string) {
  await db
    .insert(streamerbotCounters)
    .values({
      key: counterKey,
      value: 0,
      lastResetAt: null,
      updatedAt: new Date(),
      metadata: {},
    })
    .onConflictDoNothing();

  const [row] = await db
    .select()
    .from(streamerbotCounters)
    .where(eq(streamerbotCounters.key, counterKey))
    .limit(1);

  return row ?? null;
}

function buildStreamerbotCounterReply(input: {
  action: StreamerbotCounterCommandAction;
  count: number;
  amount?: number;
  requestedBy?: string | null;
  counterLabel: string;
}) {
  const prefix = input.requestedBy ? `${input.requestedBy}, ` : "";
  const subject = `contador de ${input.counterLabel}`;

  switch (input.action) {
    case "increment":
      return `${prefix}${subject}: ${input.count}${input.amount && input.amount > 1 ? ` (+${input.amount})` : ""}.`;
    case "reset":
      return `${prefix}${subject} resetado. Total atual: ${input.count}.`;
    case "get":
    default:
      return `${prefix}${subject} atual: ${input.count}.`;
  }
}

type SessionYoutubeChannel = {
  youtubeChannelId: string;
  youtubeDisplayName: string;
  youtubeHandle?: string | null;
};

type SessionBootstrapInput = {
  googleUserId: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
  youtubeChannels?: SessionYoutubeChannel[] | null;
};

type GoogleAccountSessionState = {
  googleAccount: GoogleAccountRecord;
  activeViewer: ViewerRecord;
};

function serializeViewer(row: typeof users.$inferSelect): ViewerRecord {
  return {
    id: row.id,
    googleUserId: row.googleUserId,
    email: row.email,
    youtubeChannelId: row.youtubeChannelId,
    youtubeDisplayName: row.youtubeDisplayName,
    youtubeHandle: row.youtubeHandle ?? null,
    avatarUrl: row.avatarUrl,
    isLinked: row.isLinked,
    excludeFromRanking: row.excludeFromRanking,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeViewerBalance(row: typeof viewerBalances.$inferSelect): ViewerBalanceRecord {
  return {
    viewerId: row.viewerId,
    currentBalance: row.currentBalance,
    lifetimeEarned: row.lifetimeEarned,
    lifetimeSpent: row.lifetimeSpent,
    lastSyncedAt: row.lastSyncedAt.toISOString(),
  };
}

function serializeGoogleAccount(row: typeof googleAccounts.$inferSelect): GoogleAccountRecord {
  return {
    id: row.id,
    googleUserId: row.googleUserId,
    email: row.email,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    activeViewerId: row.activeViewerId,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeGoogleAccountViewer(row: typeof googleAccountViewers.$inferSelect): GoogleAccountViewerRecord {
  return {
    id: row.id,
    googleAccountId: row.googleAccountId,
    viewerId: row.viewerId,
    createdAt: row.createdAt.toISOString(),
  };
}

function buildViewerChannelOption(viewer: ViewerRecord, balance: ViewerBalanceRecord): ViewerChannelOptionRecord {
  return {
    id: viewer.id,
    youtubeChannelId: viewer.youtubeChannelId,
    youtubeDisplayName: viewer.youtubeDisplayName,
    youtubeHandle: viewer.youtubeHandle ?? null,
    isLinked: viewer.isLinked,
    currentBalance: balance.currentBalance,
    lifetimeEarned: balance.lifetimeEarned,
    lifetimeSpent: balance.lifetimeSpent,
    hasPlatformData:
      balance.currentBalance !== 0 || balance.lifetimeEarned !== 0 || balance.lifetimeSpent !== 0,
  };
}

function buildViewerRecord(input: {
  googleUserId: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
  youtubeChannelId: string;
  youtubeDisplayName: string;
  youtubeHandle?: string | null;
  isLinked: boolean;
}) {
  return {
    id: randomUUID(),
    googleUserId: input.googleUserId,
    email: input.email,
    youtubeChannelId: input.youtubeChannelId,
    youtubeDisplayName: input.youtubeDisplayName,
    youtubeHandle: normalizeYoutubeHandle(input.youtubeHandle),
    avatarUrl: input.image,
    isLinked: input.isLinked,
    excludeFromRanking: shouldExcludeFromRanking(input.email),
    createdAt: new Date().toISOString(),
  } satisfies ViewerRecord;
}

function buildGoogleAccountRecord(input: {
  googleUserId: string | null;
  email: string;
  name: string | null;
  image: string | null;
}) {
  return {
    id: randomUUID(),
    googleUserId: input.googleUserId,
    email: input.email,
    displayName: input.name,
    avatarUrl: input.image,
    activeViewerId: null,
    createdAt: new Date().toISOString(),
  } satisfies GoogleAccountRecord;
}

function buildGoogleAccountViewerLink(input: { googleAccountId: string; viewerId: string }) {
  return {
    id: randomUUID(),
    googleAccountId: input.googleAccountId,
    viewerId: input.viewerId,
    createdAt: new Date().toISOString(),
  } satisfies GoogleAccountViewerRecord;
}

function normalizeSessionYoutubeChannels(channels: SessionBootstrapInput["youtubeChannels"]) {
  const seen = new Set<string>();
  return (channels ?? []).flatMap((channel) => {
    const youtubeChannelId = channel.youtubeChannelId.trim();
    if (!youtubeChannelId || seen.has(youtubeChannelId)) {
      return [];
    }
    seen.add(youtubeChannelId);
    return [
      {
        youtubeChannelId,
        youtubeDisplayName: channel.youtubeDisplayName.trim() || youtubeChannelId,
        youtubeHandle: normalizeYoutubeHandle(channel.youtubeHandle),
      } satisfies SessionYoutubeChannel,
    ];
  });
}

function isSyntheticYoutubeChannelId(youtubeChannelId: string) {
  return youtubeChannelId.startsWith("session:");
}

function isSyntheticViewer(viewer: ViewerRecord | null) {
  return Boolean(viewer && isSyntheticYoutubeChannelId(viewer.youtubeChannelId));
}

function filterVisibleViewerChannels(channels: ViewerChannelOptionRecord[]) {
  const hasRealChannels = channels.some((channel) => !isSyntheticYoutubeChannelId(channel.youtubeChannelId));
  if (!hasRealChannels) {
    return channels;
  }
  return channels.filter((channel) => !isSyntheticYoutubeChannelId(channel.youtubeChannelId));
}

function viewerHasStoredActivity(input: {
  currentBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  hasLedger: boolean;
  hasRedemptions: boolean;
  hasBetEntries: boolean;
}) {
  return (
    input.currentBalance !== 0 ||
    input.lifetimeEarned !== 0 ||
    input.lifetimeSpent !== 0 ||
    input.hasLedger ||
    input.hasRedemptions ||
    input.hasBetEntries
  );
}

function getDemoViewerActivity(store: DemoStore, viewerId: string) {
  const balance = getBalance(store, viewerId);
  return {
    currentBalance: balance.currentBalance,
    lifetimeEarned: balance.lifetimeEarned,
    lifetimeSpent: balance.lifetimeSpent,
    hasLedger: store.ledger.some((entry) => entry.viewerId === viewerId),
    hasRedemptions: store.redemptions.some((entry) => entry.viewerId === viewerId),
    hasBetEntries: store.betEntries.some((entry) => entry.viewerId === viewerId),
  };
}

type ViewerMergeResult = {
  merged: boolean;
  transferredOwnerLink: boolean;
};

function mergeDemoViewerIntoTarget(input: {
  store: DemoStore;
  googleAccountId: string;
  sourceViewerId: string;
  targetViewerId: string;
}): ViewerMergeResult {
  const { store, googleAccountId, sourceViewerId, targetViewerId } = input;
  if (sourceViewerId === targetViewerId) {
    return { merged: false, transferredOwnerLink: false };
  }

  const sourceViewer = getDemoViewerById(store, sourceViewerId);
  const targetViewer = getDemoViewerById(store, targetViewerId);
  if (!sourceViewer || !targetViewer) {
    return { merged: false, transferredOwnerLink: false };
  }

  const targetBetIds = new Set(
    store.betEntries.filter((entry) => entry.viewerId === targetViewerId).map((entry) => entry.betId),
  );
  const hasConflictingBetEntries = store.betEntries.some(
    (entry) => entry.viewerId === sourceViewerId && targetBetIds.has(entry.betId),
  );
  if (hasConflictingBetEntries) {
    return { merged: false, transferredOwnerLink: false };
  }

  const sourceOwnerLink = getDemoViewerGoogleAccountLink(store, sourceViewerId);
  const targetOwnerLink = getDemoViewerGoogleAccountLink(store, targetViewerId);
  if (sourceOwnerLink && sourceOwnerLink.googleAccountId !== googleAccountId) {
    return { merged: false, transferredOwnerLink: false };
  }
  if (
    targetOwnerLink &&
    sourceOwnerLink &&
    targetOwnerLink.googleAccountId !== sourceOwnerLink.googleAccountId
  ) {
    return { merged: false, transferredOwnerLink: false };
  }

  const sourceBalance = getBalance(store, sourceViewerId);
  const targetBalance = getBalance(store, targetViewerId);
  targetBalance.currentBalance += sourceBalance.currentBalance;
  targetBalance.lifetimeEarned += sourceBalance.lifetimeEarned;
  targetBalance.lifetimeSpent += sourceBalance.lifetimeSpent;
  targetBalance.lastSyncedAt =
    sourceBalance.lastSyncedAt > targetBalance.lastSyncedAt ? sourceBalance.lastSyncedAt : targetBalance.lastSyncedAt;

  for (const entry of store.ledger) {
    if (entry.viewerId === sourceViewerId) {
      entry.viewerId = targetViewerId;
    }
  }
  for (const entry of store.redemptions) {
    if (entry.viewerId === sourceViewerId) {
      entry.viewerId = targetViewerId;
    }
  }
  for (const entry of store.betEntries) {
    if (entry.viewerId === sourceViewerId) {
      entry.viewerId = targetViewerId;
    }
  }
  for (const entry of store.gameSuggestions) {
    if (entry.viewerId === sourceViewerId) {
      entry.viewerId = targetViewerId;
    }
  }
  for (const entry of store.gameSuggestionBoosts) {
    if (entry.viewerId === sourceViewerId) {
      entry.viewerId = targetViewerId;
    }
  }
  for (const account of store.googleAccounts) {
    if (account.activeViewerId === sourceViewerId) {
      account.activeViewerId = targetViewerId;
    }
  }

  let transferredOwnerLink = false;
  if (sourceOwnerLink && !targetOwnerLink) {
    sourceOwnerLink.viewerId = targetViewerId;
    transferredOwnerLink = true;
  } else if (sourceOwnerLink) {
    store.googleAccountViewers = store.googleAccountViewers.filter((entry) => entry.viewerId !== sourceViewerId);
  }

  store.balances = store.balances.filter((entry) => entry.viewerId !== sourceViewerId);
  store.viewers = store.viewers.filter((entry) => entry.id !== sourceViewerId);

  return { merged: true, transferredOwnerLink };
}

async function mergeViewerIntoTarget(input: {
  googleAccountId: string;
  sourceViewerId: string;
  targetViewerId: string;
}): Promise<ViewerMergeResult> {
  if (input.sourceViewerId === input.targetViewerId) {
    return { merged: false, transferredOwnerLink: false };
  }

  const db = getDb();
  if (isDemoMode || !db) {
    return mergeDemoViewerIntoTarget({
      store: getDemoStore(),
      googleAccountId: input.googleAccountId,
      sourceViewerId: input.sourceViewerId,
      targetViewerId: input.targetViewerId,
    });
  }

  return db.transaction(async (tx) => {
    const [sourceViewer, targetViewer, sourceBalance, targetBalance, sourceOwnerLink, targetOwnerLink] =
      await Promise.all([
        tx.select().from(users).where(eq(users.id, input.sourceViewerId)).limit(1),
        tx.select().from(users).where(eq(users.id, input.targetViewerId)).limit(1),
        tx.select().from(viewerBalances).where(eq(viewerBalances.viewerId, input.sourceViewerId)).limit(1),
        tx.select().from(viewerBalances).where(eq(viewerBalances.viewerId, input.targetViewerId)).limit(1),
        tx
          .select()
          .from(googleAccountViewers)
          .where(eq(googleAccountViewers.viewerId, input.sourceViewerId))
          .limit(1),
        tx
          .select()
          .from(googleAccountViewers)
          .where(eq(googleAccountViewers.viewerId, input.targetViewerId))
          .limit(1),
      ]);

    if (!sourceViewer[0] || !targetViewer[0]) {
      return { merged: false, transferredOwnerLink: false };
    }
    if (sourceOwnerLink[0] && sourceOwnerLink[0].googleAccountId !== input.googleAccountId) {
      return { merged: false, transferredOwnerLink: false };
    }
    if (
      sourceOwnerLink[0] &&
      targetOwnerLink[0] &&
      sourceOwnerLink[0].googleAccountId !== targetOwnerLink[0].googleAccountId
    ) {
      return { merged: false, transferredOwnerLink: false };
    }

    const [sourceBetRows, targetBetRows] = await Promise.all([
      tx.select({ betId: betEntries.betId }).from(betEntries).where(eq(betEntries.viewerId, input.sourceViewerId)),
      tx.select({ betId: betEntries.betId }).from(betEntries).where(eq(betEntries.viewerId, input.targetViewerId)),
    ]);
    const targetBetIds = new Set(targetBetRows.map((entry) => entry.betId));
    const hasConflictingBetEntries = sourceBetRows.some((entry) => targetBetIds.has(entry.betId));
    if (hasConflictingBetEntries) {
      return { merged: false, transferredOwnerLink: false };
    }

    await tx.update(pointLedger).set({ viewerId: input.targetViewerId }).where(eq(pointLedger.viewerId, input.sourceViewerId));
    await tx.update(redemptions).set({ viewerId: input.targetViewerId }).where(eq(redemptions.viewerId, input.sourceViewerId));
    await tx.update(betEntries).set({ viewerId: input.targetViewerId }).where(eq(betEntries.viewerId, input.sourceViewerId));
    await tx
      .update(gameSuggestions)
      .set({ viewerId: input.targetViewerId })
      .where(eq(gameSuggestions.viewerId, input.sourceViewerId));
    await tx
      .update(gameSuggestionBoosts)
      .set({ viewerId: input.targetViewerId })
      .where(eq(gameSuggestionBoosts.viewerId, input.sourceViewerId));
    await tx
      .update(googleAccounts)
      .set({ activeViewerId: input.targetViewerId })
      .where(eq(googleAccounts.activeViewerId, input.sourceViewerId));

    let transferredOwnerLink = false;
    if (sourceOwnerLink[0] && !targetOwnerLink[0]) {
      await tx
        .update(googleAccountViewers)
        .set({ viewerId: input.targetViewerId })
        .where(eq(googleAccountViewers.id, sourceOwnerLink[0].id));
      transferredOwnerLink = true;
    } else if (sourceOwnerLink[0]) {
      await tx.delete(googleAccountViewers).where(eq(googleAccountViewers.viewerId, input.sourceViewerId));
    }

    if (targetBalance[0]) {
      await tx
        .update(viewerBalances)
        .set({
          currentBalance: (targetBalance[0].currentBalance ?? 0) + (sourceBalance[0]?.currentBalance ?? 0),
          lifetimeEarned: (targetBalance[0].lifetimeEarned ?? 0) + (sourceBalance[0]?.lifetimeEarned ?? 0),
          lifetimeSpent: (targetBalance[0].lifetimeSpent ?? 0) + (sourceBalance[0]?.lifetimeSpent ?? 0),
          lastSyncedAt:
            sourceBalance[0] && sourceBalance[0].lastSyncedAt > targetBalance[0].lastSyncedAt
              ? sourceBalance[0].lastSyncedAt
              : targetBalance[0].lastSyncedAt,
        })
        .where(eq(viewerBalances.viewerId, input.targetViewerId));
    } else if (sourceBalance[0]) {
      await tx.insert(viewerBalances).values({
        viewerId: input.targetViewerId,
        currentBalance: sourceBalance[0].currentBalance,
        lifetimeEarned: sourceBalance[0].lifetimeEarned,
        lifetimeSpent: sourceBalance[0].lifetimeSpent,
        lastSyncedAt: sourceBalance[0].lastSyncedAt,
      });
    }

    await tx.delete(viewerBalances).where(eq(viewerBalances.viewerId, input.sourceViewerId));
    await tx.delete(users).where(eq(users.id, input.sourceViewerId));

    return { merged: true, transferredOwnerLink };
  });
}

function pruneDemoSyntheticViewersForGoogleAccount(store: DemoStore, googleAccountId: string, preservedViewerIds: string[]) {
  const viewers = listDemoViewersForGoogleAccount(store, googleAccountId);
  const hasRealViewer = viewers.some((viewer) => !isSyntheticYoutubeChannelId(viewer.youtubeChannelId));
  if (!hasRealViewer) {
    return;
  }

  const protectedIds = new Set(preservedViewerIds);
  const removableIds = new Set(
    viewers
      .filter((viewer) => isSyntheticYoutubeChannelId(viewer.youtubeChannelId) && !protectedIds.has(viewer.id))
      .filter((viewer) => !viewerHasStoredActivity(getDemoViewerActivity(store, viewer.id)))
      .map((viewer) => viewer.id),
  );
  if (removableIds.size === 0) {
    return;
  }

  store.googleAccountViewers = store.googleAccountViewers.filter((entry) => !removableIds.has(entry.viewerId));
  store.balances = store.balances.filter((entry) => !removableIds.has(entry.viewerId));
  store.viewers = store.viewers.filter((entry) => !removableIds.has(entry.id));
}

function getDemoGoogleAccountByIdentity(
  store: DemoStore,
  input: Pick<SessionBootstrapInput, "googleUserId" | "email">,
) {
  if (input.googleUserId) {
    const account = store.googleAccounts.find((entry) => entry.googleUserId === input.googleUserId);
    if (account) {
      return account;
    }
  }

  if (!input.email) {
    return null;
  }

  return store.googleAccounts.find((entry) => entry.email === input.email) ?? null;
}

function getDemoViewerById(store: DemoStore, viewerId: string) {
  return store.viewers.find((entry) => entry.id === viewerId) ?? null;
}

function getDemoViewerByYoutubeChannelId(store: DemoStore, youtubeChannelId: string) {
  return store.viewers.find((entry) => entry.youtubeChannelId === youtubeChannelId) ?? null;
}

function getDemoGoogleAccountViewerLinks(store: DemoStore, googleAccountId: string) {
  return store.googleAccountViewers.filter((entry) => entry.googleAccountId === googleAccountId);
}

function getDemoViewerGoogleAccountLink(store: DemoStore, viewerId: string) {
  return store.googleAccountViewers.find((entry) => entry.viewerId === viewerId) ?? null;
}

function listDemoViewersForGoogleAccount(store: DemoStore, googleAccountId: string) {
  return getDemoGoogleAccountViewerLinks(store, googleAccountId)
    .map((entry) => getDemoViewerById(store, entry.viewerId))
    .filter((entry): entry is ViewerRecord => Boolean(entry));
}

function listDemoViewerChannels(googleAccountId: string) {
  const store = getDemoStore();
  return listDemoViewersForGoogleAccount(store, googleAccountId).map((viewer) =>
    buildViewerChannelOption(viewer, getBalance(store, viewer.id)),
  );
}

function serializeBet(row: typeof bets.$inferSelect): BetRecord {
  return {
    id: row.id,
    question: row.question,
    status: row.status as BetRecord["status"],
    openedAt: row.openedAt?.toISOString() ?? null,
    closesAt: row.closesAt.toISOString(),
    lockedAt: row.lockedAt?.toISOString() ?? null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    winningOptionId: row.winningOptionId,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeBetOption(row: typeof betOptions.$inferSelect): BetOptionRecord {
  return {
    id: row.id,
    betId: row.betId,
    label: row.label,
    sortOrder: row.sortOrder,
    poolAmount: row.poolAmount,
  };
}

function serializeBetEntry(row: typeof betEntries.$inferSelect): BetEntryRecord {
  return {
    id: row.id,
    betId: row.betId,
    optionId: row.optionId,
    viewerId: row.viewerId,
    amount: row.amount,
    payoutAmount: row.payoutAmount,
    settledAt: row.settledAt?.toISOString() ?? null,
    refundedAt: row.refundedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function buildViewerPosition(
  bet: BetRecord,
  entry: BetEntryRecord | null,
): BetViewerPositionRecord | null {
  if (!entry) {
    return null;
  }

  return {
    amount: entry.amount,
    optionId: entry.optionId,
    payoutAmount: entry.payoutAmount,
    refundedAt: entry.refundedAt,
    settledAt: entry.settledAt,
    isWinner:
      bet.status === "resolved" && bet.winningOptionId
        ? bet.winningOptionId === entry.optionId
        : null,
  };
}

function buildBetWithOptions(params: {
  bet: BetRecord;
  options: BetOptionRecord[];
  viewerEntry?: BetEntryRecord | null;
}): BetWithOptionsRecord {
  const options = [...params.options].sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    ...params.bet,
    totalPool: options.reduce((sum, option) => sum + option.poolAmount, 0),
    options,
    viewerPosition: buildViewerPosition(params.bet, params.viewerEntry ?? null),
  };
}

function serializeGameSuggestion(row: typeof gameSuggestions.$inferSelect): GameSuggestionRecord {
  return {
    id: row.id,
    viewerId: row.viewerId,
    slug: row.slug,
    name: row.name,
    description: row.description ?? null,
    linkUrl: row.linkUrl ?? null,
    status: row.status as GameSuggestionRecord["status"],
    totalVotes: row.totalVotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeGameSuggestionBoost(
  row: typeof gameSuggestionBoosts.$inferSelect,
): GameSuggestionBoostRecord {
  return {
    id: row.id,
    suggestionId: row.suggestionId,
    viewerId: row.viewerId,
    amount: row.amount,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeQuote(row: typeof quotes.$inferSelect): QuoteRecord {
  return {
    id: row.id,
    quoteNumber: row.quoteNumber,
    body: row.body,
    createdByViewerId: row.createdByViewerId,
    createdByDisplayName: row.createdByDisplayName,
    createdByYoutubeHandle: row.createdByYoutubeHandle ?? null,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeProductRecommendation(
  row: typeof productRecommendations.$inferSelect,
): ProductRecommendationRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category as ProductRecommendationRecord["category"],
    context: row.context,
    imageUrl: row.imageUrl,
    href: row.href,
    storeLabel: row.storeLabel,
    linkKind: row.linkKind as ProductRecommendationRecord["linkKind"],
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildGameSuggestionWithMeta(params: {
  suggestion: GameSuggestionRecord;
  viewer: ViewerRecord | null;
  boosts?: GameSuggestionBoostRecord[];
}): GameSuggestionWithMeta {
  const boosts = params.boosts ?? [];
  return {
    ...params.suggestion,
    suggestedBy: params.viewer?.youtubeDisplayName ?? "Viewer",
    suggestedByYoutubeHandle: params.viewer?.youtubeHandle ?? null,
    viewerBoostTotal: boosts.reduce((sum, entry) => sum + entry.amount, 0),
  };
}

function listDemoQuotes() {
  const store = getDemoStore();
  return [...store.quotes].sort((a, b) => a.quoteNumber - b.quoteNumber);
}

export async function listQuotes() {
  const db = getDb();

  if (isDemoMode || !db) {
    return [...listDemoQuotes()].sort((a, b) => b.quoteNumber - a.quoteNumber);
  }

  const rows = await db.select().from(quotes).orderBy(desc(quotes.quoteNumber));
  return rows.map(serializeQuote);
}

async function createQuoteRecord(input: {
  body: string;
  viewer: ViewerRecord;
  source: string;
}) {
  const body = input.body.trim();
  if (!body) {
    throw new Error("quote_text_required");
  }

  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    const nextQuoteNumber =
      store.quotes.reduce((highest, entry) => Math.max(highest, entry.quoteNumber), 0) + 1;
    const createdAt = new Date().toISOString();
    const quote: QuoteRecord = {
      id: randomUUID(),
      quoteNumber: nextQuoteNumber,
      body,
      createdByViewerId: input.viewer.id,
      createdByDisplayName: input.viewer.youtubeDisplayName,
      createdByYoutubeHandle: input.viewer.youtubeHandle ?? null,
      source: input.source,
      createdAt,
    };
    store.quotes.push(quote);
    return quote;
  }

  return db.transaction(async (tx) => {
    const [latestQuote] = await tx
      .select({ quoteNumber: quotes.quoteNumber })
      .from(quotes)
      .orderBy(desc(quotes.quoteNumber))
      .limit(1);

    const [createdQuote] = await tx
      .insert(quotes)
      .values({
        id: randomUUID(),
        quoteNumber: (latestQuote?.quoteNumber ?? 0) + 1,
        body,
        createdByViewerId: input.viewer.id,
        createdByDisplayName: input.viewer.youtubeDisplayName,
        createdByYoutubeHandle: input.viewer.youtubeHandle ?? null,
        source: input.source,
        createdAt: new Date(),
      })
      .returning();

    if (!createdQuote) {
      throw new Error("quote_create_failed");
    }

    return serializeQuote(createdQuote);
  });
}

async function getQuoteRecord(input: { quoteId?: number | null }) {
  const quoteId = input.quoteId ?? null;
  const db = getDb();

  if (isDemoMode || !db) {
    const quotes = listDemoQuotes();
    if (quotes.length === 0) {
      throw new Error("quote_list_empty");
    }

    if (quoteId) {
      const found = quotes.find((entry) => entry.quoteNumber === quoteId);
      if (!found) {
        throw new Error("quote_not_found");
      }
      return found;
    }

    return quotes[Math.floor(Math.random() * quotes.length)]!;
  }

  if (quoteId) {
    const [quote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.quoteNumber, quoteId))
      .limit(1);

    if (!quote) {
      throw new Error("quote_not_found");
    }

    return serializeQuote(quote);
  }

  const allQuotes = await db.select().from(quotes).orderBy(desc(quotes.quoteNumber));
  if (allQuotes.length === 0) {
    throw new Error("quote_list_empty");
  }

  return serializeQuote(allQuotes[Math.floor(Math.random() * allQuotes.length)]!);
}

function listDemoGameSuggestions(viewerId?: string | null) {
  const store = getDemoStore();
  const viewerBoosts = viewerId
    ? store.gameSuggestionBoosts.filter((entry) => entry.viewerId === viewerId)
    : [];

  return [...store.gameSuggestions]
    .sort((a, b) => {
      if (b.totalVotes !== a.totalVotes) {
        return b.totalVotes - a.totalVotes;
      }

      return +new Date(b.createdAt) - +new Date(a.createdAt);
    })
    .map((suggestion) =>
      buildGameSuggestionWithMeta({
        suggestion,
        viewer: getDemoViewerById(store, suggestion.viewerId),
        boosts: viewerBoosts.filter((entry) => entry.suggestionId === suggestion.id),
      }),
    );
}

function resolveChatTargetBet(input: {
  bets: BetWithOptionsRecord[];
  betId?: string | null;
  now?: Date;
}) {
  if (input.betId) {
    const targetBet = input.bets.find((bet) => bet.id === input.betId);
    if (!targetBet) {
      throw new Error("Aposta nao encontrada.");
    }

    return targetBet;
  }

  const nowMs = (input.now ?? new Date()).getTime();
  const openBets = input.bets.filter(
    (bet) => bet.status === "open" && new Date(bet.closesAt).getTime() > nowMs,
  );

  if (openBets.length === 0) {
    throw new Error("Aposta nao encontrada.");
  }

  if (openBets.length > 1) {
    throw new Error("multiple_open_bets");
  }

  return openBets[0];
}

function resolveChatBetOption(input: {
  bet: BetWithOptionsRecord;
  optionId?: string | null;
  optionIndex?: number | null;
  optionLabel?: string | null;
}) {
  if (input.optionId) {
    const option = input.bet.options.find((entry) => entry.id === input.optionId);
    if (option) {
      return option;
    }
  }

  const parsedLabelIndex =
    input.optionLabel && /^\d+$/.test(input.optionLabel.trim())
      ? Number.parseInt(input.optionLabel.trim(), 10)
      : null;
  const optionIndex = Number.isInteger(input.optionIndex) ? input.optionIndex : parsedLabelIndex;
  if (typeof optionIndex === "number" && optionIndex >= 1) {
    const option = input.bet.options[optionIndex - 1];
    if (option) {
      return option;
    }
  }

  const normalizedLabel = input.optionLabel ? slugify(input.optionLabel) : "";
  if (normalizedLabel) {
    const option = input.bet.options.find((entry) => slugify(entry.label) === normalizedLabel);
    if (option) {
      return option;
    }
  }

  throw new Error("invalid_option");
}

function parseExplicitLivestreamState(payload: Record<string, unknown>) {
  const raw = payload.isLive;
  if (typeof raw === "boolean") {
    return raw;
  }

  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }

  return null;
}

function listDemoBets(viewer: ViewerRecord | null) {
  const store = getDemoStore();
  return store.bets
    .map((bet) =>
      buildBetWithOptions({
        bet,
        options: store.betOptions.filter((option) => option.betId === bet.id),
        viewerEntry: viewer
          ? store.betEntries.find((entry) => entry.betId === bet.id && entry.viewerId === viewer.id) ?? null
          : null,
      }),
    )
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

function isMissingBetSchemaError(error: unknown) {
  const tableNames = ['"bets"', '"bet_options"', '"bet_entries"', "bets", "bet_options", "bet_entries"];
  const queue: unknown[] = [error];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);

    const message =
      current instanceof Error ? current.message : typeof current === "string" ? current : "";
    const normalized = message.toLowerCase();
    const mentionsBetTables = tableNames.some((tableName) => normalized.includes(tableName));
    if (
      mentionsBetTables &&
      (normalized.includes("does not exist") ||
        normalized.includes("relation") ||
        normalized.includes("table") ||
        normalized.includes("failed query"))
    ) {
      return true;
    }

    if (typeof current === "object" && current && "cause" in current) {
      queue.push((current as { cause?: unknown }).cause);
    }
  }

  return false;
}

function isMissingGameSuggestionSchemaError(error: unknown) {
  const tableNames = [
    '"game_suggestions"',
    '"game_suggestion_boosts"',
    "game_suggestions",
    "game_suggestion_boosts",
  ];
  const queue: unknown[] = [error];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);

    const message =
      current instanceof Error ? current.message : typeof current === "string" ? current : "";
    const normalized = message.toLowerCase();
    const mentionsTables = tableNames.some((tableName) => normalized.includes(tableName));
    if (
      mentionsTables &&
      (normalized.includes("does not exist") ||
        normalized.includes("relation") ||
        normalized.includes("table") ||
        normalized.includes("failed query"))
    ) {
      return true;
    }

    if (typeof current === "object" && current && "cause" in current) {
      queue.push((current as { cause?: unknown }).cause);
    }
  }

  return false;
}

function isMissingProductRecommendationSchemaError(error: unknown) {
  const tableNames = ['"product_recommendations"', "product_recommendations"];
  const queue: unknown[] = [error];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }
    visited.add(current);

    const message =
      current instanceof Error ? current.message : typeof current === "string" ? current : "";
    const normalized = message.toLowerCase();
    const mentionsTables = tableNames.some((tableName) => normalized.includes(tableName));
    if (
      mentionsTables &&
      (normalized.includes("does not exist") ||
        normalized.includes("relation") ||
        normalized.includes("table") ||
        normalized.includes("failed query"))
    ) {
      return true;
    }

    if (typeof current === "object" && current && "cause" in current) {
      queue.push((current as { cause?: unknown }).cause);
    }
  }

  return false;
}

async function withGoogleAccountById(googleAccountId: string) {
  const db = getDb();

  if (isDemoMode || !db) {
    return getDemoStore().googleAccounts.find((entry) => entry.id === googleAccountId) ?? null;
  }

  const [account] = await db.select().from(googleAccounts).where(eq(googleAccounts.id, googleAccountId)).limit(1);
  return account ? serializeGoogleAccount(account) : null;
}

async function withGoogleAccountByIdentity(input: Pick<SessionBootstrapInput, "googleUserId" | "email">) {
  const db = getDb();

  if (isDemoMode || !db) {
    return getDemoGoogleAccountByIdentity(getDemoStore(), input);
  }

  if (input.googleUserId) {
    const [byGoogleId] = await db
      .select()
      .from(googleAccounts)
      .where(eq(googleAccounts.googleUserId, input.googleUserId))
      .limit(1);
    if (byGoogleId) {
      return serializeGoogleAccount(byGoogleId);
    }
  }

  if (!input.email) {
    return null;
  }

  const [byEmail] = await db.select().from(googleAccounts).where(eq(googleAccounts.email, input.email)).limit(1);
  return byEmail ? serializeGoogleAccount(byEmail) : null;
}

async function withViewerById(viewerId: string) {
  const db = getDb();

  if (isDemoMode || !db) {
    return getDemoViewerById(getDemoStore(), viewerId);
  }

  const [viewer] = await db.select().from(users).where(eq(users.id, viewerId)).limit(1);
  return viewer ? serializeViewer(viewer) : null;
}

async function withViewerByYoutubeChannelId(youtubeChannelId: string) {
  const db = getDb();

  if (isDemoMode || !db) {
    return getDemoViewerByYoutubeChannelId(getDemoStore(), youtubeChannelId);
  }

  const [viewer] = await db.select().from(users).where(eq(users.youtubeChannelId, youtubeChannelId)).limit(1);
  return viewer ? serializeViewer(viewer) : null;
}

async function withGoogleAccountViewerLinkByViewerId(viewerId: string) {
  const db = getDb();

  if (isDemoMode || !db) {
    return getDemoViewerGoogleAccountLink(getDemoStore(), viewerId);
  }

  const [link] = await db
    .select()
    .from(googleAccountViewers)
    .where(eq(googleAccountViewers.viewerId, viewerId))
    .limit(1);
  return link ? serializeGoogleAccountViewer(link) : null;
}

async function listViewersForGoogleAccount(googleAccountId: string) {
  const db = getDb();

  if (isDemoMode || !db) {
    return listDemoViewersForGoogleAccount(getDemoStore(), googleAccountId);
  }

  const rows = await db
    .select({
      viewer: users,
    })
    .from(googleAccountViewers)
    .innerJoin(users, eq(googleAccountViewers.viewerId, users.id))
    .where(eq(googleAccountViewers.googleAccountId, googleAccountId))
    .orderBy(desc(googleAccountViewers.createdAt));

  return rows.map(({ viewer }) => serializeViewer(viewer));
}

async function pruneSyntheticViewersForGoogleAccount(googleAccountId: string, preservedViewerIds: string[]) {
  const db = getDb();

  if (isDemoMode || !db) {
    pruneDemoSyntheticViewersForGoogleAccount(getDemoStore(), googleAccountId, preservedViewerIds);
    return;
  }

  const viewers = await listViewersForGoogleAccount(googleAccountId);
  const hasRealViewer = viewers.some((viewer) => !isSyntheticYoutubeChannelId(viewer.youtubeChannelId));
  if (!hasRealViewer) {
    return;
  }

  const protectedIds = new Set(preservedViewerIds);
  const removableViewerIds: string[] = [];

  for (const viewer of viewers) {
    if (!isSyntheticYoutubeChannelId(viewer.youtubeChannelId) || protectedIds.has(viewer.id)) {
      continue;
    }

    const [balance, ledger, redemption, betEntry] = await Promise.all([
      db.select().from(viewerBalances).where(eq(viewerBalances.viewerId, viewer.id)).limit(1),
      db.select({ id: pointLedger.id }).from(pointLedger).where(eq(pointLedger.viewerId, viewer.id)).limit(1),
      db.select({ id: redemptions.id }).from(redemptions).where(eq(redemptions.viewerId, viewer.id)).limit(1),
      db.select({ id: betEntries.id }).from(betEntries).where(eq(betEntries.viewerId, viewer.id)).limit(1),
    ]);

    const storedActivity = viewerHasStoredActivity({
      currentBalance: balance[0]?.currentBalance ?? 0,
      lifetimeEarned: balance[0]?.lifetimeEarned ?? 0,
      lifetimeSpent: balance[0]?.lifetimeSpent ?? 0,
      hasLedger: Boolean(ledger[0]),
      hasRedemptions: Boolean(redemption[0]),
      hasBetEntries: Boolean(betEntry[0]),
    });
    if (!storedActivity) {
      removableViewerIds.push(viewer.id);
    }
  }

  if (removableViewerIds.length === 0) {
    return;
  }

  for (const viewerId of removableViewerIds) {
    await db.delete(googleAccountViewers).where(eq(googleAccountViewers.viewerId, viewerId));
    await db.delete(viewerBalances).where(eq(viewerBalances.viewerId, viewerId));
    await db.delete(users).where(eq(users.id, viewerId));
  }
}

export async function listViewerChannelsForGoogleAccount(googleAccountId: string) {
  const googleAccount = await withGoogleAccountById(googleAccountId);
  if (!googleAccount) {
    return [];
  }

  const sortChannels = (channels: ViewerChannelOptionRecord[]) =>
    [...channels].sort((a, b) => {
      const activeDelta = Number(b.id === googleAccount.activeViewerId) - Number(a.id === googleAccount.activeViewerId);
      if (activeDelta !== 0) {
        return activeDelta;
      }
      return a.youtubeDisplayName.localeCompare(b.youtubeDisplayName);
    });

  const db = getDb();
  if (isDemoMode || !db) {
    return sortChannels(filterVisibleViewerChannels(listDemoViewerChannels(googleAccountId)));
  }

  const rows = await db
    .select({
      viewer: users,
      balance: viewerBalances,
    })
    .from(googleAccountViewers)
    .innerJoin(users, eq(googleAccountViewers.viewerId, users.id))
    .innerJoin(viewerBalances, eq(users.id, viewerBalances.viewerId))
    .where(eq(googleAccountViewers.googleAccountId, googleAccountId))
    .orderBy(desc(googleAccountViewers.createdAt));

  return sortChannels(
    filterVisibleViewerChannels(
      rows.map(({ viewer, balance }) => buildViewerChannelOption(serializeViewer(viewer), serializeViewerBalance(balance))),
    ),
  );
}

export async function setActiveViewerForGoogleAccount(googleAccountId: string, viewerId: string) {
  const channels = await listViewerChannelsForGoogleAccount(googleAccountId);
  if (!channels.some((entry) => entry.id === viewerId)) {
    return null;
  }

  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    const account = store.googleAccounts.find((entry) => entry.id === googleAccountId);
    if (!account) {
      return null;
    }
    account.activeViewerId = viewerId;
    return getDemoViewerById(store, viewerId);
  }

  await db
    .update(googleAccounts)
    .set({
      activeViewerId: viewerId,
    })
    .where(eq(googleAccounts.id, googleAccountId));

  return withViewerById(viewerId);
}

export async function getSessionViewerState(
  input: Pick<SessionBootstrapInput, "googleUserId" | "email">,
): Promise<GoogleAccountSessionState | null> {
  if (!input.email) {
    return null;
  }

  const googleAccount = await withGoogleAccountByIdentity(input);
  if (!googleAccount) {
    return null;
  }

  const visibleChannels = await listViewerChannelsForGoogleAccount(googleAccount.id);
  const activeViewerId = visibleChannels.some((channel) => channel.id === googleAccount.activeViewerId)
    ? googleAccount.activeViewerId
    : visibleChannels[0]?.id;
  if (!activeViewerId) {
    return null;
  }

  const activeViewer = await withViewerById(activeViewerId);
  if (!activeViewer) {
    return null;
  }

  return {
    googleAccount,
    activeViewer,
  };
}

export async function ensureViewerFromSession(input: SessionBootstrapInput) {
  if (!input.email) {
    return null;
  }

  const youtubeChannels = normalizeSessionYoutubeChannels(input.youtubeChannels);
  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    let googleAccount = getDemoGoogleAccountByIdentity(store, input);

    if (!googleAccount) {
      googleAccount = buildGoogleAccountRecord({
        googleUserId: input.googleUserId,
        email: input.email,
        name: input.name,
        image: input.image,
      });
      store.googleAccounts.push(googleAccount);
    }

    const activeViewer = googleAccount.activeViewerId ? getDemoViewerById(store, googleAccount.activeViewerId) : null;
    let reusableSyntheticViewer = isSyntheticViewer(activeViewer) ? activeViewer : null;
    const syncedViewerIds: string[] = [];

    for (const channel of youtubeChannels) {
      let viewer = getDemoViewerByYoutubeChannelId(store, channel.youtubeChannelId);
      let existingOwner = viewer ? getDemoViewerGoogleAccountLink(store, viewer.id) : null;
      if (existingOwner && existingOwner.googleAccountId !== googleAccount.id) {
        continue;
      }

      if (viewer && reusableSyntheticViewer && viewer.id !== reusableSyntheticViewer.id) {
        const mergeResult = await mergeViewerIntoTarget({
          googleAccountId: googleAccount.id,
          sourceViewerId: reusableSyntheticViewer.id,
          targetViewerId: viewer.id,
        });
        if (mergeResult.merged) {
          reusableSyntheticViewer = null;
          existingOwner = mergeResult.transferredOwnerLink
            ? getDemoViewerGoogleAccountLink(store, viewer.id)
            : existingOwner;
        }
      }

      if (!viewer && reusableSyntheticViewer) {
        viewer = reusableSyntheticViewer;
        reusableSyntheticViewer = null;
        existingOwner = getDemoViewerGoogleAccountLink(store, viewer.id);
      }

      if (!viewer) {
        viewer = buildViewerRecord({
          googleUserId: input.googleUserId,
          email: input.email,
          name: input.name,
          image: input.image,
          youtubeChannelId: channel.youtubeChannelId,
          youtubeDisplayName: channel.youtubeDisplayName,
          youtubeHandle: channel.youtubeHandle,
          isLinked: true,
        });
        store.viewers.push(viewer);
        getBalance(store, viewer.id);
      }

      viewer.googleUserId = input.googleUserId;
      viewer.email = input.email;
      viewer.avatarUrl = input.image ?? viewer.avatarUrl;
      viewer.youtubeChannelId = channel.youtubeChannelId;
      viewer.youtubeDisplayName = channel.youtubeDisplayName;
      viewer.youtubeHandle = channel.youtubeHandle ?? viewer.youtubeHandle ?? null;
      viewer.isLinked = true;
      viewer.excludeFromRanking = shouldExcludeFromRanking(input.email);

      if (!existingOwner) {
        store.googleAccountViewers.push(
          buildGoogleAccountViewerLink({
            googleAccountId: googleAccount.id,
            viewerId: viewer.id,
          }),
        );
      }

      syncedViewerIds.push(viewer.id);
    }

    if (youtubeChannels.length > 0) {
      pruneDemoSyntheticViewersForGoogleAccount(store, googleAccount.id, syncedViewerIds);
    }

    let preferredViewer =
      activeViewer && syncedViewerIds.includes(activeViewer.id)
        ? activeViewer
        : syncedViewerIds[0]
          ? getDemoViewerById(store, syncedViewerIds[0])
          : activeViewer ?? listDemoViewersForGoogleAccount(store, googleAccount.id)[0] ?? null;

    if (!preferredViewer) {
      preferredViewer = buildViewerRecord({
        googleUserId: input.googleUserId,
        email: input.email,
        name: input.name,
        image: input.image,
        youtubeChannelId: buildSyntheticYoutubeChannelId({
          googleUserId: input.googleUserId,
          email: input.email,
        }),
        youtubeDisplayName: input.name ?? input.email.split("@")[0],
        isLinked: false,
      });
      store.viewers.push(preferredViewer);
      getBalance(store, preferredViewer.id);
    }

    preferredViewer.googleUserId = input.googleUserId;
    preferredViewer.email = input.email;
    preferredViewer.avatarUrl = input.image ?? preferredViewer.avatarUrl;
    preferredViewer.excludeFromRanking = shouldExcludeFromRanking(input.email);

    const ownerLink = getDemoViewerGoogleAccountLink(store, preferredViewer.id);
    if (!ownerLink) {
      store.googleAccountViewers.push(
        buildGoogleAccountViewerLink({
          googleAccountId: googleAccount.id,
          viewerId: preferredViewer.id,
        }),
      );
    }

    googleAccount.googleUserId = input.googleUserId;
    googleAccount.email = input.email;
    googleAccount.displayName = input.name;
    googleAccount.avatarUrl = input.image;
    googleAccount.activeViewerId = preferredViewer.id;

    return preferredViewer;
  }

  let googleAccount = await withGoogleAccountByIdentity(input);
  if (!googleAccount) {
    googleAccount = buildGoogleAccountRecord({
      googleUserId: input.googleUserId,
      email: input.email,
      name: input.name,
      image: input.image,
    });

    await db.insert(googleAccounts).values({
      id: googleAccount.id,
      googleUserId: googleAccount.googleUserId,
      email: googleAccount.email,
      displayName: googleAccount.displayName,
      avatarUrl: googleAccount.avatarUrl,
      activeViewerId: null,
      createdAt: new Date(googleAccount.createdAt),
    });
  }

  const activeViewer = googleAccount.activeViewerId ? await withViewerById(googleAccount.activeViewerId) : null;
  let reusableSyntheticViewer = isSyntheticViewer(activeViewer) ? activeViewer : null;
  const syncedViewerIds: string[] = [];

  for (const channel of youtubeChannels) {
    let viewer = await withViewerByYoutubeChannelId(channel.youtubeChannelId);
    let existingOwner = viewer ? await withGoogleAccountViewerLinkByViewerId(viewer.id) : null;
    if (existingOwner && existingOwner.googleAccountId !== googleAccount.id) {
      continue;
    }

    if (viewer && reusableSyntheticViewer && viewer.id !== reusableSyntheticViewer.id) {
      const mergeResult = await mergeViewerIntoTarget({
        googleAccountId: googleAccount.id,
        sourceViewerId: reusableSyntheticViewer.id,
        targetViewerId: viewer.id,
      });
      if (mergeResult.merged) {
        reusableSyntheticViewer = null;
        existingOwner = mergeResult.transferredOwnerLink
          ? await withGoogleAccountViewerLinkByViewerId(viewer.id)
          : existingOwner;
      }
    }

    if (!viewer && reusableSyntheticViewer) {
      viewer = reusableSyntheticViewer;
      reusableSyntheticViewer = null;
      existingOwner = await withGoogleAccountViewerLinkByViewerId(viewer.id);
    }

    if (!viewer) {
      viewer = buildViewerRecord({
        googleUserId: input.googleUserId,
        email: input.email,
        name: input.name,
        image: input.image,
        youtubeChannelId: channel.youtubeChannelId,
        youtubeDisplayName: channel.youtubeDisplayName,
        youtubeHandle: channel.youtubeHandle,
        isLinked: true,
      });

      await db.insert(users).values({
        id: viewer.id,
        googleUserId: viewer.googleUserId,
        email: viewer.email,
        youtubeChannelId: viewer.youtubeChannelId,
        youtubeDisplayName: viewer.youtubeDisplayName,
        youtubeHandle: viewer.youtubeHandle,
        avatarUrl: viewer.avatarUrl,
        isLinked: viewer.isLinked,
        excludeFromRanking: viewer.excludeFromRanking,
        createdAt: new Date(viewer.createdAt),
      });

      await db.insert(viewerBalances).values({
        viewerId: viewer.id,
        currentBalance: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
        lastSyncedAt: new Date(),
      });
    }

    await db
      .update(users)
      .set({
        googleUserId: input.googleUserId,
        email: input.email,
        youtubeChannelId: channel.youtubeChannelId,
        youtubeDisplayName: channel.youtubeDisplayName,
        youtubeHandle: channel.youtubeHandle ?? viewer.youtubeHandle ?? null,
        avatarUrl: input.image ?? viewer.avatarUrl,
        isLinked: true,
        excludeFromRanking: shouldExcludeFromRanking(input.email),
      })
      .where(eq(users.id, viewer.id));

    if (!existingOwner) {
      const link = buildGoogleAccountViewerLink({
        googleAccountId: googleAccount.id,
        viewerId: viewer.id,
      });
      await db.insert(googleAccountViewers).values({
        id: link.id,
        googleAccountId: link.googleAccountId,
        viewerId: link.viewerId,
        createdAt: new Date(link.createdAt),
      });
    }

    syncedViewerIds.push(viewer.id);
  }

  if (youtubeChannels.length > 0) {
    await pruneSyntheticViewersForGoogleAccount(googleAccount.id, syncedViewerIds);
  }

  let preferredViewer =
    activeViewer && syncedViewerIds.includes(activeViewer.id)
      ? activeViewer
      : syncedViewerIds[0]
        ? await withViewerById(syncedViewerIds[0])
        : activeViewer;

  if (!preferredViewer) {
    const firstLinkedViewer = (await listViewerChannelsForGoogleAccount(googleAccount.id))[0];
    preferredViewer = firstLinkedViewer ? await withViewerById(firstLinkedViewer.id) : null;
  }

  if (!preferredViewer) {
    preferredViewer = buildViewerRecord({
      googleUserId: input.googleUserId,
      email: input.email,
      name: input.name,
      image: input.image,
      youtubeChannelId: buildSyntheticYoutubeChannelId({
        googleUserId: input.googleUserId,
        email: input.email,
      }),
      youtubeDisplayName: input.name ?? input.email.split("@")[0],
      isLinked: false,
    });

    await db.insert(users).values({
      id: preferredViewer.id,
      googleUserId: preferredViewer.googleUserId,
      email: preferredViewer.email,
      youtubeChannelId: preferredViewer.youtubeChannelId,
      youtubeDisplayName: preferredViewer.youtubeDisplayName,
      youtubeHandle: preferredViewer.youtubeHandle,
      avatarUrl: preferredViewer.avatarUrl,
      isLinked: preferredViewer.isLinked,
      excludeFromRanking: preferredViewer.excludeFromRanking,
      createdAt: new Date(preferredViewer.createdAt),
    });

    await db.insert(viewerBalances).values({
      viewerId: preferredViewer.id,
      currentBalance: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      lastSyncedAt: new Date(),
    });
  }

  await db
    .update(users)
    .set({
      googleUserId: input.googleUserId,
      email: input.email,
      avatarUrl: input.image ?? preferredViewer.avatarUrl,
      isLinked: preferredViewer.isLinked,
      excludeFromRanking: shouldExcludeFromRanking(input.email),
    })
    .where(eq(users.id, preferredViewer.id));

  const ownerLink = await withGoogleAccountViewerLinkByViewerId(preferredViewer.id);
  if (!ownerLink) {
    const link = buildGoogleAccountViewerLink({
      googleAccountId: googleAccount.id,
      viewerId: preferredViewer.id,
    });
    await db.insert(googleAccountViewers).values({
      id: link.id,
      googleAccountId: link.googleAccountId,
      viewerId: link.viewerId,
      createdAt: new Date(link.createdAt),
    });
  }

  await db
    .update(googleAccounts)
    .set({
      googleUserId: input.googleUserId,
      email: input.email,
      displayName: input.name,
      avatarUrl: input.image,
      activeViewerId: preferredViewer.id,
    })
    .where(eq(googleAccounts.id, googleAccount.id));

  return withViewerById(preferredViewer.id);
}

export async function getCatalog() {
  const db = getDb();

  if (isDemoMode || !db) {
    return getDemoStore().catalog;
  }

  const rows = await db.select().from(catalogItems).orderBy(desc(catalogItems.isFeatured), catalogItems.cost);
  return rows.map((row) => ({
    ...row,
    type: row.type as CatalogItemRecord["type"],
    stock: row.stock,
    previewImageUrl: row.previewImageUrl,
    streamerbotArgsTemplate: row.streamerbotArgsTemplate as Record<string, unknown>,
  }));
}

export async function getLeaderboard() {
  const db = getDb();

  if (isDemoMode || !db) {
    const store = getDemoStore();
    return store.viewers
      .map((viewer) => ({
        viewer,
        balance: getBalance(store, viewer.id),
      }))
      .sort((a, b) => b.balance.currentBalance - a.balance.currentBalance);
  }

  const rows = await db
    .select({
      id: users.id,
      youtubeChannelId: users.youtubeChannelId,
      youtubeDisplayName: users.youtubeDisplayName,
      youtubeHandle: users.youtubeHandle,
      avatarUrl: users.avatarUrl,
      currentBalance: viewerBalances.currentBalance,
      lifetimeEarned: viewerBalances.lifetimeEarned,
      lifetimeSpent: viewerBalances.lifetimeSpent,
      lastSyncedAt: viewerBalances.lastSyncedAt,
    })
    .from(users)
    .innerJoin(viewerBalances, eq(users.id, viewerBalances.viewerId))
    .where(eq(users.excludeFromRanking, false))
    .orderBy(desc(viewerBalances.currentBalance));

  return rows;
}

export async function getViewerByYoutubeChannelId(youtubeChannelId: string) {
  const db = getDb();

  if (isDemoMode || !db) {
    const store = getDemoStore();
    const viewer = store.viewers.find((entry) => entry.youtubeChannelId === youtubeChannelId);
    if (!viewer) {
      return null;
    }

    return {
      viewer,
      balance: getBalance(store, viewer.id),
    };
  }

  const [row] = await db
    .select({
      id: users.id,
      youtubeChannelId: users.youtubeChannelId,
      youtubeDisplayName: users.youtubeDisplayName,
      youtubeHandle: users.youtubeHandle,
      avatarUrl: users.avatarUrl,
      currentBalance: viewerBalances.currentBalance,
      lifetimeEarned: viewerBalances.lifetimeEarned,
      lifetimeSpent: viewerBalances.lifetimeSpent,
      lastSyncedAt: viewerBalances.lastSyncedAt,
    })
    .from(users)
    .innerJoin(viewerBalances, eq(users.id, viewerBalances.viewerId))
    .where(eq(users.youtubeChannelId, youtubeChannelId))
    .limit(1);

  return row ?? null;
}

export async function getViewerDashboard(viewerId: string) {
  const viewer = await withViewerById(viewerId);
  if (!viewer) {
    return null;
  }

  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    const balance = getBalance(store, viewer.id);
    const redemptions = store.redemptions
      .filter((entry) => entry.viewerId === viewer.id)
      .sort((a, b) => +new Date(b.queuedAt) - +new Date(a.queuedAt));

    return { viewer, balance, redemptions };
  }

  const [balance] = await db.select().from(viewerBalances).where(eq(viewerBalances.viewerId, viewer.id)).limit(1);
  const history = await db
    .select()
    .from(redemptions)
    .where(eq(redemptions.viewerId, viewer.id))
    .orderBy(desc(redemptions.queuedAt));
  return {
    viewer,
    balance: {
      viewerId: viewer.id,
      currentBalance: balance?.currentBalance ?? 0,
      lifetimeEarned: balance?.lifetimeEarned ?? 0,
      lifetimeSpent: balance?.lifetimeSpent ?? 0,
      lastSyncedAt: balance?.lastSyncedAt.toISOString() ?? new Date().toISOString(),
    },
    redemptions: history.map((entry) => ({
      ...entry,
      status: entry.status as RedemptionRecord["status"],
      claimedByBridgeId: entry.claimedByBridgeId,
      queuedAt: entry.queuedAt.toISOString(),
      executedAt: entry.executedAt?.toISOString() ?? null,
      failedAt: entry.failedAt?.toISOString() ?? null,
    })),
  };
}

export async function listBets(viewerId?: string | null) {
  const viewer = viewerId ? await withViewerById(viewerId) : null;
  const db = getDb();

  if (isDemoMode || !db) {
    return listDemoBets(viewer);
  }

  let betRows: Array<typeof bets.$inferSelect>;
  let optionRows: Array<typeof betOptions.$inferSelect>;
  let entryRows: Array<typeof betEntries.$inferSelect>;

  try {
    [betRows, optionRows, entryRows] = await Promise.all([
      db.select().from(bets).orderBy(desc(bets.createdAt)),
      db.select().from(betOptions),
      viewer ? db.select().from(betEntries).where(eq(betEntries.viewerId, viewer.id)) : Promise.resolve([]),
    ]);
  } catch (error) {
    if (isMissingBetSchemaError(error)) {
      return listDemoBets(viewer);
    }
    throw error;
  }

  const options = optionRows.map(serializeBetOption);
  const entries = entryRows.map(serializeBetEntry);

  return betRows.map((row) =>
    buildBetWithOptions({
      bet: serializeBet(row),
      options: options.filter((option) => option.betId === row.id),
      viewerEntry: viewer ? entries.find((entry) => entry.betId === row.id && entry.viewerId === viewer.id) ?? null : null,
    }),
  );
}

export async function listAdminBets() {
  return listBets();
}

export async function listGameSuggestions(viewerId?: string | null) {
  const db = getDb();

  if (isDemoMode || !db) {
    return listDemoGameSuggestions(viewerId);
  }

  let suggestionRows: Array<typeof gameSuggestions.$inferSelect>;
  let boostRows: Array<typeof gameSuggestionBoosts.$inferSelect>;

  try {
    [suggestionRows, boostRows] = await Promise.all([
      db.select().from(gameSuggestions).orderBy(desc(gameSuggestions.totalVotes), desc(gameSuggestions.createdAt)),
      viewerId
        ? db.select().from(gameSuggestionBoosts).where(eq(gameSuggestionBoosts.viewerId, viewerId))
        : Promise.resolve([]),
    ]);
  } catch (error) {
    if (isMissingGameSuggestionSchemaError(error)) {
      return listDemoGameSuggestions(viewerId);
    }
    throw error;
  }

  const serializedSuggestions = suggestionRows.map(serializeGameSuggestion);
  const viewerIds = [...new Set(serializedSuggestions.map((entry) => entry.viewerId))];
  const suggestionViewers = viewerIds.length
    ? await db.select().from(users).where(inArray(users.id, viewerIds))
    : [];
  const viewerMap = new Map(suggestionViewers.map((row) => [row.id, serializeViewer(row)]));
  const serializedBoosts = boostRows.map(serializeGameSuggestionBoost);

  return serializedSuggestions.map((suggestion) =>
    buildGameSuggestionWithMeta({
      suggestion,
      viewer: viewerMap.get(suggestion.viewerId) ?? null,
      boosts: serializedBoosts.filter((entry) => entry.suggestionId === suggestion.id),
    }),
  );
}

export async function listAdminGameSuggestions() {
  return listGameSuggestions();
}

export async function listProductRecommendations(options?: {
  includeInactive?: boolean;
}) {
  const includeInactive = options?.includeInactive ?? false;
  const db = getDb();

  if (isDemoMode || !db) {
    const store = getDemoStore();
    const source = includeInactive
      ? store.productRecommendations
      : store.productRecommendations.filter((entry) => entry.isActive);

    return [...source].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.name.localeCompare(b.name);
    });
  }

  try {
    const rows = includeInactive
      ? await db
          .select()
          .from(productRecommendations)
          .orderBy(productRecommendations.sortOrder, productRecommendations.name)
      : await db
          .select()
          .from(productRecommendations)
          .where(eq(productRecommendations.isActive, true))
          .orderBy(productRecommendations.sortOrder, productRecommendations.name);

    return rows.map(serializeProductRecommendation);
  } catch (error) {
    if (isMissingProductRecommendationSchemaError(error)) {
      const store = getDemoStore();
      const source = includeInactive
        ? store.productRecommendations
        : store.productRecommendations.filter((entry) => entry.isActive);

      return [...source].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.name.localeCompare(b.name);
      });
    }
    throw error;
  }
}

export async function listAdminProductRecommendations() {
  return listProductRecommendations({ includeInactive: true });
}

export async function createGameSuggestion(input: {
  viewerId: string;
  name: string;
  description?: string | null;
  linkUrl?: string | null;
  source?: string;
}) {
  const viewer = await withViewerById(input.viewerId);
  if (!viewer) {
    throw new Error("Viewer nao encontrado.");
  }

  const name = input.name.trim();
  const slug = slugify(name);
  const description = input.description?.trim() || null;
  const linkUrl = input.linkUrl?.trim() || null;
  if (!slug) {
    throw new Error("invalid_name");
  }

  const source = input.source ?? "web";
  const suggestionId = randomUUID();
  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    const duplicate = store.gameSuggestions.find(
      (entry) => entry.slug === slug && (entry.status === "open" || entry.status === "accepted"),
    );
    if (duplicate) {
      throw new Error("suggestion_already_exists");
    }

    const balance = getBalance(store, input.viewerId);
    if (balance.currentBalance < GAME_SUGGESTION_CREATION_COST) {
      throw new Error("saldo_insuficiente");
    }

    const createdAt = new Date().toISOString();
    balance.currentBalance -= GAME_SUGGESTION_CREATION_COST;
    balance.lifetimeSpent += GAME_SUGGESTION_CREATION_COST;
    balance.lastSyncedAt = createdAt;

    const suggestion: GameSuggestionRecord = {
      id: suggestionId,
      viewerId: input.viewerId,
      slug,
      name,
      description,
      linkUrl,
      status: "open",
      totalVotes: 0,
      createdAt,
      updatedAt: createdAt,
    };
    store.gameSuggestions.unshift(suggestion);

    createLedgerEntry(store, {
      viewerId: input.viewerId,
      kind: "game_suggestion_creation",
      amount: -GAME_SUGGESTION_CREATION_COST,
      source,
      externalEventId: null,
      metadata: { suggestionId, slug },
      createdAt,
    });

    return buildGameSuggestionWithMeta({ suggestion, viewer, boosts: [] });
  }

  const createdAt = new Date();
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(gameSuggestions)
      .where(and(eq(gameSuggestions.slug, slug), inArray(gameSuggestions.status, ["open", "accepted"])))
      .limit(1);
    if (existing) {
      throw new Error("suggestion_already_exists");
    }

    const [debited] = await tx
      .update(viewerBalances)
      .set({
        currentBalance: sql`${viewerBalances.currentBalance} - ${GAME_SUGGESTION_CREATION_COST}`,
        lifetimeSpent: sql`${viewerBalances.lifetimeSpent} + ${GAME_SUGGESTION_CREATION_COST}`,
        lastSyncedAt: createdAt,
      })
      .where(
        and(
          eq(viewerBalances.viewerId, input.viewerId),
          gte(viewerBalances.currentBalance, GAME_SUGGESTION_CREATION_COST),
        ),
      )
      .returning({ viewerId: viewerBalances.viewerId });
    if (!debited) {
      throw new Error("saldo_insuficiente");
    }

    await tx.insert(gameSuggestions).values({
      id: suggestionId,
      viewerId: input.viewerId,
      slug,
      name,
      description,
      linkUrl,
      status: "open",
      totalVotes: 0,
      createdAt,
      updatedAt: createdAt,
    });

    await tx.insert(pointLedger).values({
      id: randomUUID(),
      viewerId: input.viewerId,
      kind: "game_suggestion_creation",
      amount: -GAME_SUGGESTION_CREATION_COST,
      source,
      externalEventId: null,
      metadata: { suggestionId, slug },
      createdAt,
    });
  });

  const created = (await listGameSuggestions(input.viewerId)).find((entry) => entry.id === suggestionId);
  if (!created) {
    throw new Error("Falha ao criar sugestao.");
  }
  return created;
}

export async function boostGameSuggestion(input: {
  suggestionId: string;
  viewerId: string;
  amount: number;
  source: string;
}) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("invalid_amount");
  }

  const viewer = await withViewerById(input.viewerId);
  if (!viewer) {
    throw new Error("Viewer nao encontrado.");
  }

  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    const suggestion = store.gameSuggestions.find((entry) => entry.id === input.suggestionId);
    if (!suggestion) {
      throw new Error("suggestion_not_found");
    }
    if (suggestion.status !== "open") {
      throw new Error("suggestion_not_open");
    }

    const balance = getBalance(store, input.viewerId);
    if (balance.currentBalance < input.amount) {
      throw new Error("saldo_insuficiente");
    }

    const now = new Date().toISOString();
    balance.currentBalance -= input.amount;
    balance.lifetimeSpent += input.amount;
    balance.lastSyncedAt = now;

    suggestion.totalVotes += input.amount;
    suggestion.updatedAt = now;

    const boost: GameSuggestionBoostRecord = {
      id: randomUUID(),
      suggestionId: suggestion.id,
      viewerId: input.viewerId,
      amount: input.amount,
      createdAt: now,
    };
    store.gameSuggestionBoosts.unshift(boost);

    createLedgerEntry(store, {
      viewerId: input.viewerId,
      kind: "game_suggestion_boost",
      amount: -input.amount,
      source: input.source,
      externalEventId: null,
      metadata: { suggestionId: suggestion.id },
      createdAt: now,
    });

    return buildGameSuggestionWithMeta({
      suggestion,
      viewer: getDemoViewerById(store, suggestion.viewerId),
      boosts: store.gameSuggestionBoosts.filter(
        (entry) => entry.viewerId === input.viewerId && entry.suggestionId === suggestion.id,
      ),
    });
  }

  await db.transaction(async (tx) => {
    const [suggestion] = await tx
      .select()
      .from(gameSuggestions)
      .where(eq(gameSuggestions.id, input.suggestionId))
      .limit(1);
    if (!suggestion) {
      throw new Error("suggestion_not_found");
    }
    if (suggestion.status !== "open") {
      throw new Error("suggestion_not_open");
    }

    const now = new Date();
    const [debited] = await tx
      .update(viewerBalances)
      .set({
        currentBalance: sql`${viewerBalances.currentBalance} - ${input.amount}`,
        lifetimeSpent: sql`${viewerBalances.lifetimeSpent} + ${input.amount}`,
        lastSyncedAt: now,
      })
      .where(
        and(
          eq(viewerBalances.viewerId, input.viewerId),
          gte(viewerBalances.currentBalance, input.amount),
        ),
      )
      .returning({ viewerId: viewerBalances.viewerId });
    if (!debited) {
      throw new Error("saldo_insuficiente");
    }

    await tx.insert(gameSuggestionBoosts).values({
      id: randomUUID(),
      suggestionId: input.suggestionId,
      viewerId: input.viewerId,
      amount: input.amount,
      createdAt: now,
    });

    await tx
      .update(gameSuggestions)
      .set({
        totalVotes: sql`${gameSuggestions.totalVotes} + ${input.amount}`,
        updatedAt: now,
      })
      .where(eq(gameSuggestions.id, input.suggestionId));

    await tx.insert(pointLedger).values({
      id: randomUUID(),
      viewerId: input.viewerId,
      kind: "game_suggestion_boost",
      amount: -input.amount,
      source: input.source,
      externalEventId: null,
      metadata: { suggestionId: input.suggestionId },
      createdAt: now,
    });
  });

  const updated = (await listGameSuggestions(input.viewerId)).find((entry) => entry.id === input.suggestionId);
  if (!updated) {
    throw new Error("suggestion_not_found");
  }
  return updated;
}

export async function updateGameSuggestionStatus(input: {
  suggestionId: string;
  status: GameSuggestionRecord["status"];
}) {
  const db = getDb();

  if (isDemoMode || !db) {
    const store = getDemoStore();
    const suggestion = store.gameSuggestions.find((entry) => entry.id === input.suggestionId);
    if (!suggestion) {
      throw new Error("suggestion_not_found");
    }
    suggestion.status = input.status;
    suggestion.updatedAt = new Date().toISOString();
    return buildGameSuggestionWithMeta({
      suggestion,
      viewer: getDemoViewerById(store, suggestion.viewerId),
    });
  }

  const updatedAt = new Date();
  const [updated] = await db
    .update(gameSuggestions)
    .set({
      status: input.status,
      updatedAt,
    })
    .where(eq(gameSuggestions.id, input.suggestionId))
    .returning();
  if (!updated) {
    throw new Error("suggestion_not_found");
  }

  const result = (await listAdminGameSuggestions()).find((entry) => entry.id === input.suggestionId);
  if (!result) {
    throw new Error("suggestion_not_found");
  }
  return result;
}

export async function createBet(input: {
  question: string;
  closesAt: string;
  options: string[];
  startOpen?: boolean;
}) {
  const createdAt = new Date().toISOString();
  const bet: BetRecord = {
    id: randomUUID(),
    question: input.question,
    status: input.startOpen === false ? "draft" : "open",
    openedAt: input.startOpen === false ? null : createdAt,
    closesAt: input.closesAt,
    lockedAt: null,
    resolvedAt: null,
    cancelledAt: null,
    winningOptionId: null,
    createdAt,
  };
  const options = input.options.map((label, index) => ({
    id: randomUUID(),
    betId: bet.id,
    label,
    sortOrder: index,
    poolAmount: 0,
  }));

  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    store.bets.unshift(bet);
    store.betOptions.push(...options);
    return buildBetWithOptions({ bet, options, viewerEntry: null });
  }

  await db.transaction(async (tx) => {
    await tx.insert(bets).values({
      id: bet.id,
      question: bet.question,
      status: bet.status,
      openedAt: bet.openedAt ? new Date(bet.openedAt) : null,
      closesAt: new Date(bet.closesAt),
      lockedAt: null,
      resolvedAt: null,
      cancelledAt: null,
      winningOptionId: null,
      createdAt: new Date(bet.createdAt),
    });

    await tx.insert(betOptions).values(
      options.map((option) => ({
        id: option.id,
        betId: option.betId,
        label: option.label,
        sortOrder: option.sortOrder,
        poolAmount: option.poolAmount,
      })),
    );
  });

  return buildBetWithOptions({ bet, options, viewerEntry: null });
}

async function ensureViewerFromStreamerbotIdentity(input: {
  viewerExternalId: string;
  youtubeDisplayName?: string | null;
  youtubeHandle?: string | null;
}) {
  const youtubeDisplayName = input.youtubeDisplayName?.trim() || undefined;
  const youtubeHandle = normalizeYoutubeHandle(input.youtubeHandle);
  const db = getDb();

  if (isDemoMode || !db) {
    const store = getDemoStore();
    let viewer = getDemoViewerByYoutubeChannelId(store, input.viewerExternalId);

    if (!viewer) {
      viewer = buildViewerRecord({
        googleUserId: null,
        email: null,
        name: null,
        image: null,
        youtubeChannelId: input.viewerExternalId,
        youtubeDisplayName: youtubeDisplayName ?? input.viewerExternalId,
        youtubeHandle,
        isLinked: false,
      });
      store.viewers.push(viewer);
      getBalance(store, viewer.id);
      return viewer;
    }

    if (youtubeDisplayName) {
      viewer.youtubeDisplayName = youtubeDisplayName;
    }
    if (youtubeHandle) {
      viewer.youtubeHandle = youtubeHandle;
    }

    return viewer;
  }

  let viewer = await withViewerByYoutubeChannelId(input.viewerExternalId);
  if (!viewer) {
    viewer = buildViewerRecord({
      googleUserId: null,
      email: null,
      name: null,
      image: null,
      youtubeChannelId: input.viewerExternalId,
      youtubeDisplayName: youtubeDisplayName ?? input.viewerExternalId,
      youtubeHandle,
      isLinked: false,
    });

    await db.insert(users).values({
      id: viewer.id,
      googleUserId: viewer.googleUserId,
      email: viewer.email,
      youtubeChannelId: viewer.youtubeChannelId,
      youtubeDisplayName: viewer.youtubeDisplayName,
      youtubeHandle: viewer.youtubeHandle,
      avatarUrl: viewer.avatarUrl,
      isLinked: viewer.isLinked,
      excludeFromRanking: viewer.excludeFromRanking,
      createdAt: new Date(viewer.createdAt),
    });

    await db.insert(viewerBalances).values({
      viewerId: viewer.id,
      currentBalance: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      lastSyncedAt: new Date(),
    });

    return viewer;
  }

  const shouldUpdateDisplayName = Boolean(
    youtubeDisplayName && viewer.youtubeDisplayName !== youtubeDisplayName,
  );
  const shouldUpdateHandle = Boolean(youtubeHandle && viewer.youtubeHandle !== youtubeHandle);
  if (shouldUpdateDisplayName || shouldUpdateHandle) {
    await db
      .update(users)
      .set({
        ...(shouldUpdateDisplayName ? { youtubeDisplayName } : {}),
        ...(shouldUpdateHandle ? { youtubeHandle } : {}),
      })
      .where(eq(users.id, viewer.id));

    viewer = {
      ...viewer,
      youtubeDisplayName: youtubeDisplayName ?? viewer.youtubeDisplayName,
      youtubeHandle: youtubeHandle ?? viewer.youtubeHandle,
    };
  }

  return viewer;
}

async function placeBetForViewer(input: {
  viewer: ViewerRecord;
  betId: string;
  optionId: string;
  amount: number;
  source: string;
  requireLinkedViewer: boolean;
}) {
  const dashboard = await getViewerDashboard(input.viewer.id);
  if (!dashboard) {
    throw new Error("Viewer not found.");
  }
  if (input.requireLinkedViewer && !dashboard.viewer.isLinked) {
    throw new Error("Conta ainda nao vinculada ao chat.");
  }

  const existingBets = await listBets(input.viewer.id);
  const existingBet = existingBets.find((bet) => bet.id === input.betId);
  if (!existingBet) {
    throw new Error("Aposta nao encontrada.");
  }

  const existingEntry = existingBet.viewerPosition
    ? {
        id: "viewer-position",
        betId: input.betId,
        optionId: existingBet.viewerPosition.optionId,
        viewerId: dashboard.viewer.id,
        amount: existingBet.viewerPosition.amount,
        payoutAmount: existingBet.viewerPosition.payoutAmount,
        settledAt: existingBet.viewerPosition.settledAt,
        refundedAt: existingBet.viewerPosition.refundedAt,
        createdAt: existingBet.createdAt,
      }
    : null;

  const validation = evaluateBetPlacement({
    bet: existingBet,
    amount: input.amount,
    optionId: input.optionId,
    balance: dashboard.balance.currentBalance,
    existingEntry,
  });
  if (!validation.canPlace) {
    throw new Error(validation.reason);
  }

  const createdEntry: BetEntryRecord = {
    id: randomUUID(),
    betId: input.betId,
    optionId: input.optionId,
    viewerId: dashboard.viewer.id,
    amount: input.amount,
    payoutAmount: null,
    settledAt: null,
    refundedAt: null,
    createdAt: new Date().toISOString(),
  };

  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    const bet = store.bets.find((entry) => entry.id === input.betId);
    const option = store.betOptions.find(
      (entry) => entry.id === input.optionId && entry.betId === input.betId,
    );
    if (!bet || !option) {
      throw new Error("Aposta nao encontrada.");
    }

    const existingStoredEntry = store.betEntries.find(
      (entry) => entry.betId === input.betId && entry.viewerId === dashboard.viewer.id,
    );
    if (existingStoredEntry && existingStoredEntry.optionId !== input.optionId) {
      throw new Error("aposta_ja_registrada");
    }

    const balance = getBalance(store, dashboard.viewer.id);
    if (balance.currentBalance < input.amount) {
      throw new Error("saldo_insuficiente");
    }

    balance.currentBalance -= input.amount;
    balance.lifetimeSpent += input.amount;
    balance.lastSyncedAt = new Date().toISOString();
    option.poolAmount += input.amount;
    const persistedEntry = existingStoredEntry
      ? { ...existingStoredEntry, amount: existingStoredEntry.amount + input.amount }
      : createdEntry;
    if (existingStoredEntry) {
      existingStoredEntry.amount = persistedEntry.amount;
    } else {
      store.betEntries.unshift(createdEntry);
    }
    createLedgerEntry(store, {
      viewerId: dashboard.viewer.id,
      kind: "bet_debit",
      amount: -input.amount,
      source: input.source,
      externalEventId: null,
      metadata: { betId: input.betId, optionId: input.optionId },
    });
    return { ...persistedEntry };
  }

  let persistedEntry = createdEntry;
  await db.transaction(async (tx) => {
    const [betRow, optionRow, storedEntry] = await Promise.all([
      tx.select().from(bets).where(eq(bets.id, input.betId)).limit(1).then((rows) => rows[0] ?? null),
      tx.select().from(betOptions).where(eq(betOptions.id, input.optionId)).limit(1).then((rows) => rows[0] ?? null),
      tx
        .select()
        .from(betEntries)
        .where(and(eq(betEntries.betId, input.betId), eq(betEntries.viewerId, dashboard.viewer.id)))
        .limit(1)
        .then((rows) => rows[0] ?? null),
    ]);

    if (!betRow || !optionRow || optionRow.betId !== input.betId) {
      throw new Error("Aposta nao encontrada.");
    }
    if (betRow.status !== "open") {
      throw new Error("bet_not_open");
    }
    if (betRow.closesAt.getTime() <= Date.now()) {
      throw new Error("bet_closed");
    }

    if (storedEntry && storedEntry.optionId !== input.optionId) {
      throw new Error("aposta_ja_registrada");
    }

    if (storedEntry) {
      const [updatedEntry] = await tx
        .update(betEntries)
        .set({
          amount: sql`${betEntries.amount} + ${input.amount}`,
        })
        .where(eq(betEntries.id, storedEntry.id))
        .returning();

      if (!updatedEntry) {
        throw new Error("aposta_ja_registrada");
      }

      persistedEntry = serializeBetEntry(updatedEntry);
    } else {
      const insertedEntries = await tx
        .insert(betEntries)
        .values({
          id: createdEntry.id,
          betId: input.betId,
          optionId: input.optionId,
          viewerId: dashboard.viewer.id,
          amount: input.amount,
          payoutAmount: null,
          settledAt: null,
          refundedAt: null,
          createdAt: new Date(createdEntry.createdAt),
        })
        .onConflictDoNothing({
          target: [betEntries.betId, betEntries.viewerId],
        })
        .returning({ id: betEntries.id });

      if (insertedEntries.length === 0) {
        const [conflictingEntry] = await tx
          .select()
          .from(betEntries)
          .where(and(eq(betEntries.betId, input.betId), eq(betEntries.viewerId, dashboard.viewer.id)))
          .limit(1);

        if (!conflictingEntry || conflictingEntry.optionId !== input.optionId) {
          throw new Error("aposta_ja_registrada");
        }

        const [updatedEntry] = await tx
          .update(betEntries)
          .set({
            amount: sql`${betEntries.amount} + ${input.amount}`,
          })
          .where(eq(betEntries.id, conflictingEntry.id))
          .returning();

        if (!updatedEntry) {
          throw new Error("aposta_ja_registrada");
        }

        persistedEntry = serializeBetEntry(updatedEntry);
      }
    }

    const debitedBalances = await tx
      .update(viewerBalances)
      .set({
        currentBalance: sql`${viewerBalances.currentBalance} - ${input.amount}`,
        lifetimeSpent: sql`${viewerBalances.lifetimeSpent} + ${input.amount}`,
        lastSyncedAt: new Date(),
      })
      .where(
        and(
          eq(viewerBalances.viewerId, dashboard.viewer.id),
          gte(viewerBalances.currentBalance, input.amount),
        ),
      )
      .returning({ viewerId: viewerBalances.viewerId });

    if (debitedBalances.length === 0) {
      throw new Error("saldo_insuficiente");
    }

    await tx
      .update(betOptions)
      .set({
        poolAmount: sql`${betOptions.poolAmount} + ${input.amount}`,
      })
      .where(eq(betOptions.id, input.optionId));

    await tx.insert(pointLedger).values({
      id: randomUUID(),
      viewerId: dashboard.viewer.id,
      kind: "bet_debit",
      amount: -input.amount,
      source: input.source,
      externalEventId: null,
      metadata: { betId: input.betId, optionId: input.optionId },
    });
  });

  return persistedEntry;
}

export async function placeBet({
  viewerId,
  betId,
  optionId,
  amount,
  source,
}: {
  viewerId: string;
  betId: string;
  optionId: string;
  amount: number;
  source: string;
}) {
  const viewer = await withViewerById(viewerId);
  if (!viewer) {
    throw new Error("Viewer not found.");
  }

  return placeBetForViewer({
    viewer,
    betId,
    optionId,
    amount,
    source,
    requireLinkedViewer: true,
  });
}

export async function placeBetFromChatCommand(input: {
  viewerExternalId: string;
  youtubeDisplayName?: string | null;
  youtubeHandle?: string | null;
  betId?: string | null;
  optionId?: string | null;
  optionIndex?: number | null;
  optionLabel?: string | null;
  amount: number;
  source: string;
}) {
  const viewer = await ensureViewerFromStreamerbotIdentity({
    viewerExternalId: input.viewerExternalId,
    youtubeDisplayName: input.youtubeDisplayName,
    youtubeHandle: input.youtubeHandle,
  });
  const bets = await listBets();
  const bet = resolveChatTargetBet({
    bets,
    betId: input.betId,
  });
  const option = resolveChatBetOption({
    bet,
    optionId: input.optionId,
    optionIndex: input.optionIndex,
    optionLabel: input.optionLabel,
  });
  const entry = await placeBetForViewer({
    viewer,
    betId: bet.id,
    optionId: option.id,
    amount: input.amount,
    source: input.source,
    requireLinkedViewer: false,
  });

  return {
    entry,
    viewer,
    bet,
    option,
  };
}

export async function runQuoteCommandFromChat(input: {
  action: "create" | "get";
  viewerExternalId?: string;
  youtubeDisplayName?: string | null;
  youtubeHandle?: string | null;
  quoteText?: string | null;
  quoteId?: number | null;
  isModerator?: boolean;
  isBroadcaster?: boolean;
  isAdmin?: boolean;
  source: string;
}) {
  if (input.action === "create") {
    if (!input.viewerExternalId?.trim()) {
      throw new Error("viewer_external_id_required");
    }

    if (!input.quoteText?.trim()) {
      throw new Error("quote_text_required");
    }

    const viewer = await ensureViewerFromStreamerbotIdentity({
      viewerExternalId: input.viewerExternalId,
      youtubeDisplayName: input.youtubeDisplayName,
      youtubeHandle: input.youtubeHandle,
    });
    const quote = await createQuoteRecord({
      body: input.quoteText,
      viewer,
      source: input.source,
    });

    return {
      action: "create" as const,
      quote,
      viewer,
    };
  }

  const quote = await getQuoteRecord({ quoteId: input.quoteId });
  return {
    action: "get" as const,
    quote,
    viewer: null,
  };
}

export async function runStreamerbotCounterCommand(input: {
  counterKey: string;
  counterLabel?: string | null;
  action: StreamerbotCounterCommandAction;
  amount?: number;
  requestedBy?: string | null;
  source?: string | null;
  occurredAt?: string | null;
  confirmReset?: boolean;
  resetReason?: string | null;
}): Promise<StreamerbotCounterCommandResult> {
  const counterKey = input.counterKey.trim().toLowerCase();
  const amount = input.amount ?? 1;
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
  const requestedBy = input.requestedBy?.trim() || null;
  const source = input.source?.trim() || "streamerbot_chat";

  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error("invalid_occurred_at");
  }

  if (input.action === "reset" && !input.confirmReset) {
    throw new Error("reset_confirmation_required");
  }

  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    const counter = getDemoStreamerbotCounter(store, counterKey);
    const counterLabel = normalizeStreamerbotCounterLabel({
      counterKey,
      counterLabel: input.counterLabel,
      metadata: counter.metadata,
    });

    if (input.action === "increment") {
      counter.value += amount;
      counter.updatedAt = occurredAt.toISOString();
      counter.metadata = {
        lastAction: "increment",
        lastAmount: amount,
        requestedBy,
        source,
        counterLabel,
      };
    } else if (input.action === "reset") {
      const previousValue = counter.value;
      counter.value = 0;
      counter.lastResetAt = occurredAt.toISOString();
      counter.updatedAt = occurredAt.toISOString();
      counter.metadata = {
        lastAction: "reset",
        previousValue,
        requestedBy,
        source,
        counterLabel,
        resetReason: input.resetReason ?? null,
      };
    }

    const nextCounter = structuredClone(counter);
    return {
      mode: "demo",
      action: input.action,
      count: nextCounter.value,
      counter: nextCounter,
      replyMessage: buildStreamerbotCounterReply({
        action: input.action,
        count: nextCounter.value,
        amount: input.action === "increment" ? amount : undefined,
        requestedBy,
        counterLabel,
      }),
    };
  }

  if (input.action === "get") {
    const row = await ensureStreamerbotCounterRow(db, counterKey);
    const counter = row ? serializeStreamerbotCounter(row) : buildDefaultStreamerbotCounter(counterKey);
    const counterLabel = normalizeStreamerbotCounterLabel({
      counterKey,
      counterLabel: input.counterLabel,
      metadata: counter.metadata,
    });

    return {
      mode: "database",
      action: "get",
      count: counter.value,
      counter: {
        ...counter,
        metadata: {
          ...counter.metadata,
          counterLabel,
        },
      },
      replyMessage: buildStreamerbotCounterReply({
        action: "get",
        count: counter.value,
        requestedBy,
        counterLabel,
      }),
    };
  }

  const counter = await db.transaction(async (tx) => {
    const current = (await ensureStreamerbotCounterRow(tx, counterKey)) ?? {
      key: counterKey,
      value: 0,
      lastResetAt: null,
      updatedAt: occurredAt,
      metadata: {},
    };
    const counterLabel = normalizeStreamerbotCounterLabel({
      counterKey,
      counterLabel: input.counterLabel,
      metadata: current.metadata as Record<string, unknown>,
    });

    const nextValue = input.action === "increment" ? current.value + amount : 0;
    const nextLastResetAt =
      input.action === "reset" ? occurredAt : current.lastResetAt;
    const nextMetadata =
      input.action === "increment"
        ? {
            lastAction: "increment",
            lastAmount: amount,
            requestedBy,
            source,
            counterLabel,
          }
        : {
            lastAction: "reset",
            previousValue: current.value,
            requestedBy,
            source,
            counterLabel,
            resetReason: input.resetReason ?? null,
          };

    await tx
      .update(streamerbotCounters)
      .set({
        value: nextValue,
        lastResetAt: nextLastResetAt,
        updatedAt: occurredAt,
        metadata: nextMetadata,
      })
      .where(eq(streamerbotCounters.key, counterKey));

    const [updated] = await tx
      .select()
      .from(streamerbotCounters)
      .where(eq(streamerbotCounters.key, counterKey))
      .limit(1);

    return updated ?? {
      ...current,
      value: nextValue,
      lastResetAt: nextLastResetAt,
      updatedAt: occurredAt,
      metadata: nextMetadata,
    };
  });

  const serializedCounter = serializeStreamerbotCounter(counter);
  return {
    mode: "database",
    action: input.action,
    count: serializedCounter.value,
    counter: serializedCounter,
    replyMessage: buildStreamerbotCounterReply({
      action: input.action,
      count: serializedCounter.value,
      amount: input.action === "increment" ? amount : undefined,
      requestedBy,
      counterLabel: normalizeStreamerbotCounterLabel({
        counterKey,
        counterLabel: input.counterLabel,
        metadata: serializedCounter.metadata,
      }),
    }),
  };
}

export async function runDeathCounterCommand(input: {
  action: StreamerbotCounterCommandAction;
  amount?: number;
  requestedBy?: string | null;
  source?: string | null;
  occurredAt?: string | null;
  confirmReset?: boolean;
  resetReason?: string | null;
}) {
  return runStreamerbotCounterCommand({
    ...input,
    counterKey: DEFAULT_DEATH_COUNTER_KEY,
    counterLabel: DEFAULT_DEATH_COUNTER_LABEL,
  });
}

export async function lockBet(betId: string) {
  const db = getDb();

  if (isDemoMode || !db) {
    const store = getDemoStore();
    const bet = store.bets.find((entry) => entry.id === betId);
    if (!bet) {
      throw new Error("Aposta nao encontrada.");
    }
    const transition = evaluateBetLifecycleAction({ action: "lock", status: bet.status });
    if (!transition.canTransition) {
      throw new Error(transition.reason);
    }
    bet.status = "locked";
    bet.lockedAt = new Date().toISOString();
    return buildBetWithOptions({
      bet,
      options: store.betOptions.filter((option) => option.betId === betId),
      viewerEntry: null,
    });
  }

  const [betRow] = await db.select().from(bets).where(eq(bets.id, betId)).limit(1);
  if (!betRow) {
    throw new Error("Aposta nao encontrada.");
  }
  const currentBet = serializeBet(betRow);
  const transition = evaluateBetLifecycleAction({ action: "lock", status: currentBet.status });
  if (!transition.canTransition) {
    throw new Error(transition.reason);
  }
  const lockedAt = new Date();

  await db
    .update(bets)
    .set({
      status: "locked",
      lockedAt,
    })
    .where(eq(bets.id, betId));

  const optionRows = await db.select().from(betOptions).where(eq(betOptions.betId, betId));
  return buildBetWithOptions({
    bet: { ...currentBet, status: "locked", lockedAt: lockedAt.toISOString() },
    options: optionRows.map(serializeBetOption),
    viewerEntry: null,
  });
}

export async function resolveBet({
  betId,
  winningOptionId,
}: {
  betId: string;
  winningOptionId: string;
}) {
  const db = getDb();

  if (isDemoMode || !db) {
    const store = getDemoStore();
    const bet = store.bets.find((entry) => entry.id === betId);
    if (!bet) {
      throw new Error("Aposta nao encontrada.");
    }
    const transition = evaluateBetLifecycleAction({ action: "resolve", status: bet.status });
    if (!transition.canTransition) {
      throw new Error(transition.reason);
    }
    const options = store.betOptions.filter((entry) => entry.betId === betId);
    if (!options.some((option) => option.id === winningOptionId)) {
      throw new Error("Opcao vencedora invalida.");
    }
    const entries = store.betEntries.filter((entry) => entry.betId === betId);
    const shouldRefundAll = shouldRefundBetOnResolve({ entries, winningOptionId });
    const payouts = calculateBetPayouts({ entries, options, winningOptionId });
    const resolvedAt = new Date().toISOString();

    bet.status = "resolved";
    bet.winningOptionId = winningOptionId;
    bet.lockedAt ??= new Date().toISOString();
    bet.resolvedAt = resolvedAt;

    for (const entry of entries) {
      if (shouldRefundAll) {
        entry.payoutAmount = null;
        entry.settledAt = null;
        entry.refundedAt = resolvedAt;

        const balance = getBalance(store, entry.viewerId);
        balance.currentBalance += entry.amount;
        balance.lastSyncedAt = resolvedAt;
        createLedgerEntry(store, {
          viewerId: entry.viewerId,
          kind: "bet_refund",
          amount: entry.amount,
          source: "admin",
          externalEventId: null,
          metadata: { betId, optionId: entry.optionId, winningOptionId },
        });
        continue;
      }

      const settled = payouts.find((candidate) => candidate.entryId === entry.id);
      entry.payoutAmount = settled?.payoutAmount ?? 0;
      entry.settledAt = resolvedAt;
      entry.refundedAt = null;
      if ((settled?.payoutAmount ?? 0) > 0) {
        const balance = getBalance(store, entry.viewerId);
        balance.currentBalance += settled!.payoutAmount;
        balance.lifetimeEarned += settled!.payoutAmount;
        balance.lastSyncedAt = resolvedAt;
        createLedgerEntry(store, {
          viewerId: entry.viewerId,
          kind: "bet_payout",
          amount: settled!.payoutAmount,
          source: "admin",
          externalEventId: null,
          metadata: { betId, optionId: entry.optionId },
        });
      }
    }

    return buildBetWithOptions({ bet, options, viewerEntry: null });
  }

  await db.transaction(async (tx) => {
    const [betRow] = await tx.select().from(bets).where(eq(bets.id, betId)).limit(1);
    if (!betRow) {
      throw new Error("Aposta nao encontrada.");
    }
    const currentBet = serializeBet(betRow);
    const transition = evaluateBetLifecycleAction({ action: "resolve", status: currentBet.status });
    if (!transition.canTransition) {
      throw new Error(transition.reason);
    }

    const optionRows = (await tx.select().from(betOptions).where(eq(betOptions.betId, betId))).map(serializeBetOption);
    if (!optionRows.some((option) => option.id === winningOptionId)) {
      throw new Error("Opcao vencedora invalida.");
    }

    const entryRows = (await tx.select().from(betEntries).where(eq(betEntries.betId, betId))).map(serializeBetEntry);
    const shouldRefundAll = shouldRefundBetOnResolve({ entries: entryRows, winningOptionId });
    const payouts = calculateBetPayouts({ entries: entryRows, options: optionRows, winningOptionId });
    const settledAt = new Date();

    await tx
      .update(bets)
      .set({
        status: "resolved",
        winningOptionId,
        lockedAt: betRow.lockedAt ?? settledAt,
        resolvedAt: settledAt,
      })
      .where(eq(bets.id, betId));

    for (const entry of entryRows) {
      if (shouldRefundAll) {
        await tx
          .update(betEntries)
          .set({
            payoutAmount: null,
            settledAt: null,
            refundedAt: settledAt,
          })
          .where(eq(betEntries.id, entry.id));

        await tx
          .update(viewerBalances)
          .set({
            currentBalance: sql`${viewerBalances.currentBalance} + ${entry.amount}`,
            lastSyncedAt: settledAt,
          })
          .where(eq(viewerBalances.viewerId, entry.viewerId));

        await tx.insert(pointLedger).values({
          id: randomUUID(),
          viewerId: entry.viewerId,
          kind: "bet_refund",
          amount: entry.amount,
          source: "admin",
          externalEventId: null,
          metadata: { betId, optionId: entry.optionId, winningOptionId },
        });
        continue;
      }

      const payout = payouts.find((candidate) => candidate.entryId === entry.id)?.payoutAmount ?? 0;

      await tx
        .update(betEntries)
        .set({
          payoutAmount: payout,
          settledAt,
          refundedAt: null,
        })
        .where(eq(betEntries.id, entry.id));

      if (payout > 0) {
        await tx
          .update(viewerBalances)
          .set({
            currentBalance: sql`${viewerBalances.currentBalance} + ${payout}`,
            lifetimeEarned: sql`${viewerBalances.lifetimeEarned} + ${payout}`,
            lastSyncedAt: settledAt,
          })
          .where(eq(viewerBalances.viewerId, entry.viewerId));

        await tx.insert(pointLedger).values({
          id: randomUUID(),
          viewerId: entry.viewerId,
          kind: "bet_payout",
          amount: payout,
          source: "admin",
          externalEventId: null,
          metadata: { betId, optionId: entry.optionId },
        });
      }
    }
  });

  const resolvedBet = (await listBets()).find((bet) => bet.id === betId);
  if (!resolvedBet) {
    throw new Error("Aposta nao encontrada.");
  }
  return resolvedBet;
}

export async function cancelBet(betId: string) {
  const db = getDb();

  if (isDemoMode || !db) {
    const store = getDemoStore();
    const bet = store.bets.find((entry) => entry.id === betId);
    if (!bet) {
      throw new Error("Aposta nao encontrada.");
    }
    const transition = evaluateBetLifecycleAction({ action: "cancel", status: bet.status });
    if (!transition.canTransition) {
      throw new Error(transition.reason);
    }
    const entries = store.betEntries.filter((entry) => entry.betId === betId && !entry.refundedAt);
    bet.status = "cancelled";
    bet.cancelledAt = new Date().toISOString();

    for (const entry of entries) {
      entry.refundedAt = new Date().toISOString();
      const balance = getBalance(store, entry.viewerId);
      balance.currentBalance += entry.amount;
      balance.lastSyncedAt = new Date().toISOString();
      createLedgerEntry(store, {
        viewerId: entry.viewerId,
        kind: "bet_refund",
        amount: entry.amount,
        source: "admin",
        externalEventId: null,
        metadata: { betId, optionId: entry.optionId },
      });
    }

    return buildBetWithOptions({
      bet,
      options: store.betOptions.filter((option) => option.betId === betId),
      viewerEntry: null,
    });
  }

  await db.transaction(async (tx) => {
    const [betRow] = await tx.select().from(bets).where(eq(bets.id, betId)).limit(1);
    if (!betRow) {
      throw new Error("Aposta nao encontrada.");
    }
    const currentBet = serializeBet(betRow);
    const transition = evaluateBetLifecycleAction({ action: "cancel", status: currentBet.status });
    if (!transition.canTransition) {
      throw new Error(transition.reason);
    }

    const entryRows = (await tx.select().from(betEntries).where(eq(betEntries.betId, betId))).map(serializeBetEntry);
    const refundedAt = new Date();

    await tx
      .update(bets)
      .set({
        status: "cancelled",
        cancelledAt: refundedAt,
      })
      .where(eq(bets.id, betId));

    for (const entry of entryRows.filter((item) => !item.refundedAt)) {
      await tx
        .update(betEntries)
        .set({
          refundedAt,
        })
        .where(eq(betEntries.id, entry.id));

      await tx
        .update(viewerBalances)
        .set({
          currentBalance: sql`${viewerBalances.currentBalance} + ${entry.amount}`,
          lastSyncedAt: refundedAt,
        })
        .where(eq(viewerBalances.viewerId, entry.viewerId));

      await tx.insert(pointLedger).values({
        id: randomUUID(),
        viewerId: entry.viewerId,
        kind: "bet_refund",
        amount: entry.amount,
        source: "admin",
        externalEventId: null,
        metadata: { betId, optionId: entry.optionId },
      });
    }
  });

  const cancelledBet = (await listBets()).find((bet) => bet.id === betId);
  if (!cancelledBet) {
    throw new Error("Aposta nao encontrada.");
  }
  return cancelledBet;
}

export async function redeemItem({
  viewerId,
  itemId,
  source,
}: {
  viewerId: string;
  itemId: string;
  source: string;
}) {
  const dashboard = await getViewerDashboard(viewerId);
  if (!dashboard) {
    throw new Error("Viewer not found.");
  }
  if (!dashboard.viewer.isLinked) {
    throw new Error("Conta ainda nao vinculada ao chat.");
  }

  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    const item = store.catalog.find((entry) => entry.id === itemId);
    if (!item) {
      throw new Error("Item nao encontrado.");
    }

    const recentViewer = store.redemptions
      .filter((entry) => entry.catalogItemId === itemId && entry.viewerId === dashboard.viewer.id)
      .sort((a, b) => +new Date(b.queuedAt) - +new Date(a.queuedAt));
    const recentGlobal = store.redemptions
      .filter((entry) => entry.catalogItemId === itemId)
      .sort((a, b) => +new Date(b.queuedAt) - +new Date(a.queuedAt));

    const validation = evaluateRedeemability({
      item,
      balance: dashboard.balance.currentBalance,
      recentViewerRedemptions: recentViewer,
      recentGlobalRedemptions: recentGlobal,
    });

    if (!validation.canRedeem) {
      throw new Error(validation.reason);
    }

    const balance = getBalance(store, dashboard.viewer.id);
    balance.currentBalance -= item.cost;
    balance.lifetimeSpent += item.cost;
    balance.lastSyncedAt = new Date().toISOString();

    if (item.stock !== null) {
      item.stock -= 1;
    }

    createLedgerEntry(store, {
      viewerId: dashboard.viewer.id,
      kind: "redemption_debit",
      amount: -item.cost,
      source,
      externalEventId: null,
      metadata: { itemId },
    });

    const redemption: RedemptionRecord = {
      id: randomUUID(),
      viewerId: dashboard.viewer.id,
      catalogItemId: item.id,
      status: "queued",
      costAtPurchase: item.cost,
      requestSource: source,
      idempotencyKey: randomUUID(),
      bridgeAttemptCount: 0,
      claimedByBridgeId: null,
      queuedAt: new Date().toISOString(),
      executedAt: null,
      failedAt: null,
      failureReason: null,
    };
    store.redemptions.unshift(redemption);
    return redemption;
  }

  const item = (await getCatalog()).find((entry) => entry.id === itemId);
  if (!item) {
    throw new Error("Item nao encontrado.");
  }

  const recentHistory = await db
    .select()
    .from(redemptions)
    .where(eq(redemptions.catalogItemId, itemId))
    .orderBy(desc(redemptions.queuedAt));
  const recentViewer = recentHistory
    .filter((entry) => entry.viewerId === dashboard.viewer.id)
    .map((entry) => ({
      ...entry,
      status: entry.status as RedemptionRecord["status"],
      claimedByBridgeId: entry.claimedByBridgeId,
      queuedAt: entry.queuedAt.toISOString(),
      executedAt: entry.executedAt?.toISOString() ?? null,
      failedAt: entry.failedAt?.toISOString() ?? null,
    }));
  const recentGlobal = recentHistory.map((entry) => ({
    ...entry,
    status: entry.status as RedemptionRecord["status"],
    claimedByBridgeId: entry.claimedByBridgeId,
    queuedAt: entry.queuedAt.toISOString(),
    executedAt: entry.executedAt?.toISOString() ?? null,
    failedAt: entry.failedAt?.toISOString() ?? null,
  }));

  const validation = evaluateRedeemability({
    item,
    balance: dashboard.balance.currentBalance,
    recentViewerRedemptions: recentViewer,
    recentGlobalRedemptions: recentGlobal,
  });

  if (!validation.canRedeem) {
    throw new Error(validation.reason);
  }

  const redemption: RedemptionRecord = {
    id: randomUUID(),
    viewerId: dashboard.viewer.id,
    catalogItemId: item.id,
    status: "queued",
    costAtPurchase: item.cost,
    requestSource: source,
    idempotencyKey: randomUUID(),
    bridgeAttemptCount: 0,
    claimedByBridgeId: null,
    queuedAt: new Date().toISOString(),
    executedAt: null,
    failedAt: null,
    failureReason: null,
  };

  await db.transaction(async (tx) => {
    await tx.insert(redemptions).values({
      id: redemption.id,
      viewerId: redemption.viewerId,
      catalogItemId: redemption.catalogItemId,
      status: redemption.status,
      costAtPurchase: redemption.costAtPurchase,
      requestSource: redemption.requestSource,
      idempotencyKey: redemption.idempotencyKey,
      bridgeAttemptCount: 0,
      claimedByBridgeId: null,
      queuedAt: new Date(redemption.queuedAt),
    });

    await tx
      .update(viewerBalances)
      .set({
        currentBalance: sql`${viewerBalances.currentBalance} - ${item.cost}`,
        lifetimeSpent: sql`${viewerBalances.lifetimeSpent} + ${item.cost}`,
        lastSyncedAt: new Date(),
      })
      .where(eq(viewerBalances.viewerId, dashboard.viewer.id));

    await tx.insert(pointLedger).values({
      id: randomUUID(),
      viewerId: dashboard.viewer.id,
      kind: "redemption_debit",
      amount: -item.cost,
      source,
      externalEventId: null,
      metadata: { itemId },
    });

    if (item.stock !== null) {
      await tx
        .update(catalogItems)
        .set({
          stock: item.stock - 1,
        })
        .where(eq(catalogItems.id, item.id));
    }
  });

  return redemption;
}

export async function upsertCatalogItem(input: CatalogItemRecord) {
  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    const existingIndex = store.catalog.findIndex((entry) => entry.id === input.id);
    if (existingIndex >= 0) {
      store.catalog[existingIndex] = input;
    } else {
      store.catalog.unshift(input);
    }
    return input;
  }

  await db
    .insert(catalogItems)
    .values({
      ...input,
      type: input.type,
      streamerbotArgsTemplate: input.streamerbotArgsTemplate,
    })
    .onConflictDoUpdate({
      target: catalogItems.id,
      set: {
        slug: input.slug,
        name: input.name,
        description: input.description,
        type: input.type,
        cost: input.cost,
        isActive: input.isActive,
        globalCooldownSeconds: input.globalCooldownSeconds,
        viewerCooldownSeconds: input.viewerCooldownSeconds,
        stock: input.stock,
        previewImageUrl: input.previewImageUrl,
        accentColor: input.accentColor,
        isFeatured: input.isFeatured,
        streamerbotActionRef: input.streamerbotActionRef,
        streamerbotArgsTemplate: input.streamerbotArgsTemplate,
      },
    });
  return input;
}

export async function createCatalogItemFromInput(
  input: Omit<CatalogItemRecord, "id" | "slug"> & { slug?: string },
) {
  const item: CatalogItemRecord = {
    id: randomUUID(),
    slug: input.slug ?? slugify(input.name),
    ...input,
  };
  return upsertCatalogItem(item);
}

export async function upsertProductRecommendation(input: ProductRecommendationRecord) {
  const db = getDb();

  if (isDemoMode || !db) {
    const store = getDemoStore();
    const existingIndex = store.productRecommendations.findIndex((entry) => entry.id === input.id);
    if (existingIndex >= 0) {
      store.productRecommendations[existingIndex] = input;
    } else {
      store.productRecommendations.unshift(input);
    }
    return input;
  }

  try {
    await db
      .insert(productRecommendations)
      .values({
        id: input.id,
        slug: input.slug,
        name: input.name,
        category: input.category,
        context: input.context,
        imageUrl: input.imageUrl,
        href: input.href,
        storeLabel: input.storeLabel,
        linkKind: input.linkKind,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
        createdAt: new Date(input.createdAt),
        updatedAt: new Date(input.updatedAt),
      })
      .onConflictDoUpdate({
        target: productRecommendations.id,
        set: {
          slug: input.slug,
          name: input.name,
          category: input.category,
          context: input.context,
          imageUrl: input.imageUrl,
          href: input.href,
          storeLabel: input.storeLabel,
          linkKind: input.linkKind,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
          updatedAt: new Date(input.updatedAt),
        },
      });
  } catch (error) {
    if (isMissingProductRecommendationSchemaError(error)) {
      const store = getDemoStore();
      const existingIndex = store.productRecommendations.findIndex((entry) => entry.id === input.id);
      if (existingIndex >= 0) {
        store.productRecommendations[existingIndex] = input;
      } else {
        store.productRecommendations.unshift(input);
      }
      return input;
    }

    throw error;
  }

  return input;
}

export async function createProductRecommendationFromInput(
  input: Omit<ProductRecommendationRecord, "id" | "slug" | "createdAt" | "updatedAt"> & {
    slug?: string;
  },
) {
  const now = new Date().toISOString();
  const item: ProductRecommendationRecord = {
    id: randomUUID(),
    slug: input.slug ?? slugify(input.name),
    name: input.name.trim(),
    category: input.category,
    context: input.context.trim(),
    imageUrl: input.imageUrl.trim(),
    href: input.href.trim(),
    storeLabel: input.storeLabel.trim(),
    linkKind: input.linkKind,
    isActive: input.isActive,
    sortOrder: input.sortOrder,
    createdAt: now,
    updatedAt: now,
  };

  if (!item.slug) {
    throw new Error("invalid_slug");
  }

  const existing = await listAdminProductRecommendations();
  if (existing.some((entry) => entry.slug === item.slug)) {
    throw new Error("recommendation_slug_exists");
  }

  return upsertProductRecommendation(item);
}

export async function updateProductRecommendationStatus(input: {
  recommendationId: string;
  isActive: boolean;
}) {
  const db = getDb();

  if (isDemoMode || !db) {
    const store = getDemoStore();
    const recommendation = store.productRecommendations.find((entry) => entry.id === input.recommendationId);
    if (!recommendation) {
      throw new Error("recommendation_not_found");
    }

    recommendation.isActive = input.isActive;
    recommendation.updatedAt = new Date().toISOString();
    return recommendation;
  }

  try {
    const [updated] = await db
      .update(productRecommendations)
      .set({
        isActive: input.isActive,
        updatedAt: new Date(),
      })
      .where(eq(productRecommendations.id, input.recommendationId))
      .returning();

    if (!updated) {
      throw new Error("recommendation_not_found");
    }

    return serializeProductRecommendation(updated);
  } catch (error) {
    if (isMissingProductRecommendationSchemaError(error)) {
      const store = getDemoStore();
      const recommendation = store.productRecommendations.find((entry) => entry.id === input.recommendationId);
      if (!recommendation) {
        throw new Error("recommendation_not_found");
      }

      recommendation.isActive = input.isActive;
      recommendation.updatedAt = new Date().toISOString();
      return recommendation;
    }

    throw error;
  }
}

export async function deleteProductRecommendation(recommendationId: string) {
  const db = getDb();

  if (isDemoMode || !db) {
    const store = getDemoStore();
    const recommendationIndex = store.productRecommendations.findIndex(
      (entry) => entry.id === recommendationId,
    );
    if (recommendationIndex < 0) {
      throw new Error("recommendation_not_found");
    }

    const [deleted] = store.productRecommendations.splice(recommendationIndex, 1);
    if (!deleted) {
      throw new Error("recommendation_not_found");
    }

    return deleted;
  }

  try {
    const [deleted] = await db
      .delete(productRecommendations)
      .where(eq(productRecommendations.id, recommendationId))
      .returning();

    if (!deleted) {
      throw new Error("recommendation_not_found");
    }

    return serializeProductRecommendation(deleted);
  } catch (error) {
    if (isMissingProductRecommendationSchemaError(error)) {
      const store = getDemoStore();
      const recommendationIndex = store.productRecommendations.findIndex(
        (entry) => entry.id === recommendationId,
      );
      if (recommendationIndex < 0) {
        throw new Error("recommendation_not_found");
      }

      const [deleted] = store.productRecommendations.splice(recommendationIndex, 1);
      if (!deleted) {
        throw new Error("recommendation_not_found");
      }

      return deleted;
    }

    throw error;
  }
}

export async function listAdminRedemptions() {
  const db = getDb();
  if (isDemoMode || !db) {
    return getDemoStore().redemptions;
  }

  const rows = await db.select().from(redemptions).orderBy(desc(redemptions.queuedAt));
  return rows.map((entry) => ({
    ...entry,
    status: entry.status as RedemptionRecord["status"],
    claimedByBridgeId: entry.claimedByBridgeId,
    queuedAt: entry.queuedAt.toISOString(),
    executedAt: entry.executedAt?.toISOString() ?? null,
    failedAt: entry.failedAt?.toISOString() ?? null,
  }));
}

export async function adjustViewerBalance({
  viewerId,
  amount,
  reason,
}: {
  viewerId: string;
  amount: number;
  reason: string;
}) {
  const db = getDb();

  if (isDemoMode || !db) {
    const store = getDemoStore();
    const balance = getBalance(store, viewerId);
    balance.currentBalance += amount;
    if (amount > 0) {
      balance.lifetimeEarned += amount;
    } else {
      balance.lifetimeSpent += Math.abs(amount);
    }
    balance.lastSyncedAt = new Date().toISOString();

    return createLedgerEntry(store, {
      viewerId,
      kind: "manual_adjustment",
      amount,
      source: "admin",
      externalEventId: null,
      metadata: { reason },
    });
  }

  await db
    .update(viewerBalances)
    .set({
      currentBalance: sql`${viewerBalances.currentBalance} + ${amount}`,
      lifetimeEarned: amount > 0 ? sql`${viewerBalances.lifetimeEarned} + ${amount}` : viewerBalances.lifetimeEarned,
      lifetimeSpent: amount < 0 ? sql`${viewerBalances.lifetimeSpent} + ${Math.abs(amount)}` : viewerBalances.lifetimeSpent,
      lastSyncedAt: new Date(),
    })
    .where(eq(viewerBalances.viewerId, viewerId));

  await db.insert(pointLedger).values({
    id: randomUUID(),
    viewerId,
    kind: "manual_adjustment",
    amount,
    source: "admin",
    externalEventId: null,
    metadata: { reason },
  });
}

export async function getBridgeStatus() {
  const db = getDb();
  if (isDemoMode || !db) {
    return getDemoStore().bridgeClients;
  }
  const rows = await db.select().from(bridgeClients).orderBy(desc(bridgeClients.lastSeenAt));
  return rows.map((entry) => ({
    id: entry.id,
    machineKey: entry.machineKey,
    label: entry.label,
    lastSeenAt: entry.lastSeenAt.toISOString(),
  }));
}

export async function ingestStreamerbotEvent(input: {
  eventId: string;
  eventType: "presence_tick" | "chat_bonus" | "manual_adjustment";
  viewerExternalId?: string;
  youtubeDisplayName?: string;
  youtubeHandle?: string;
  amount?: number;
  balance?: number;
  occurredAt: string;
  payload: Record<string, unknown>;
}) {
  const youtubeHandle = normalizeYoutubeHandle(input.youtubeHandle);
  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();

    if (store.ledger.some((entry) => entry.externalEventId === input.eventId)) {
      return {
        mode: "demo" as const,
        deduped: true,
        eventLogInserted: false,
        viewerCreated: false,
        balanceUpdated: false,
        ledgerInserted: false,
        linkMatched: false,
      };
    }

    const viewer = store.viewers.find((entry) => entry.youtubeChannelId === input.viewerExternalId);
    if (!viewer || typeof input.amount !== "number") {
      return {
        mode: "demo" as const,
        deduped: false,
        eventLogInserted: false,
        viewerCreated: false,
        balanceUpdated: false,
        ledgerInserted: false,
        linkMatched: false,
        ignoredReason: !viewer ? "viewer_not_found" : "missing_amount",
      };
    }

    if (input.youtubeDisplayName && viewer.youtubeDisplayName !== input.youtubeDisplayName) {
      viewer.youtubeDisplayName = input.youtubeDisplayName;
    }
    if (youtubeHandle && viewer.youtubeHandle !== youtubeHandle) {
      viewer.youtubeHandle = youtubeHandle;
    }

    const balance = getBalance(store, viewer.id);
    balance.currentBalance += input.amount;
    if (input.amount > 0) {
      balance.lifetimeEarned += input.amount;
    } else {
      balance.lifetimeSpent += Math.abs(input.amount);
    }
    balance.lastSyncedAt = new Date().toISOString();

    createLedgerEntry(store, {
      viewerId: viewer.id,
      kind: input.eventType === "presence_tick" ? "presence_tick" : input.eventType === "chat_bonus" ? "chat_bonus" : "manual_adjustment",
      amount: input.amount,
      source: "streamerbot",
      externalEventId: input.eventId,
      metadata: input.payload,
      createdAt: input.occurredAt,
    });

    return {
      mode: "demo" as const,
      deduped: false,
      eventLogInserted: false,
      viewerCreated: false,
      balanceUpdated: true,
      ledgerInserted: true,
      linkMatched: false,
      viewerId: viewer.id,
    };
  }

  if (eventRequiresActiveLivestream(input.eventType)) {
    const explicitLivestreamState = parseExplicitLivestreamState(input.payload);
    const isLive =
      explicitLivestreamState === null
        ? await isStreamerbotLivestreamActive()
        : explicitLivestreamState;
    if (!isLive) {
      return {
        mode: "database" as const,
        deduped: false,
        eventLogInserted: false,
        viewerCreated: false,
        balanceUpdated: false,
        ledgerInserted: false,
        linkMatched: false,
        ignoredReason: "livestream_not_live",
      };
    }
  }

  const [existing] = await db
    .select()
    .from(streamerbotEventLog)
    .where(eq(streamerbotEventLog.eventId, input.eventId))
    .limit(1);
  if (existing) {
    return {
      mode: "database" as const,
      deduped: true,
      eventLogInserted: false,
      viewerCreated: false,
      balanceUpdated: false,
      ledgerInserted: false,
      linkMatched: false,
    };
  }

  await db.insert(streamerbotEventLog).values({
    id: randomUUID(),
    eventId: input.eventId,
    eventType: input.eventType,
    viewerExternalId: input.viewerExternalId ?? null,
    payload: input.payload,
    occurredAt: new Date(input.occurredAt),
    signatureValid: true,
  });

  if (typeof input.amount === "number" && input.viewerExternalId) {
    let viewerCreated = false;
    let [viewer] = await db
      .select()
      .from(users)
      .where(eq(users.youtubeChannelId, input.viewerExternalId))
      .limit(1);

    if (!viewer) {
      const newId = randomUUID();
      await db.insert(users).values({
        id: newId,
        googleUserId: null,
        email: null,
        youtubeChannelId: input.viewerExternalId,
        youtubeDisplayName: input.youtubeDisplayName ?? input.viewerExternalId,
        youtubeHandle,
        avatarUrl: null,
        isLinked: false,
        excludeFromRanking: false,
      });
      await db.insert(viewerBalances).values({
        viewerId: newId,
        currentBalance: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
      });
      viewerCreated = true;
      [viewer] = await db.select().from(users).where(eq(users.id, newId)).limit(1);
    } else {
      const shouldUpdateDisplayName = Boolean(
        input.youtubeDisplayName && viewer.youtubeDisplayName !== input.youtubeDisplayName,
      );
      const shouldUpdateHandle = Boolean(youtubeHandle && viewer.youtubeHandle !== youtubeHandle);
      if (!shouldUpdateDisplayName && !shouldUpdateHandle) {
        // No viewer profile fields changed from this event.
      } else {
        await db
          .update(users)
          .set({
            ...(shouldUpdateDisplayName ? { youtubeDisplayName: input.youtubeDisplayName } : {}),
            ...(shouldUpdateHandle ? { youtubeHandle } : {}),
          })
          .where(eq(users.id, viewer.id));
      }
    }

    await db
      .update(viewerBalances)
      .set({
        currentBalance: sql`${viewerBalances.currentBalance} + ${input.amount}`,
        lifetimeEarned:
          input.amount > 0
            ? sql`${viewerBalances.lifetimeEarned} + ${input.amount}`
            : viewerBalances.lifetimeEarned,
        lifetimeSpent:
          input.amount < 0
            ? sql`${viewerBalances.lifetimeSpent} + ${Math.abs(input.amount)}`
            : viewerBalances.lifetimeSpent,
        lastSyncedAt: new Date(),
      })
      .where(eq(viewerBalances.viewerId, viewer.id));

    await db.insert(pointLedger).values({
      id: randomUUID(),
      viewerId: viewer.id,
      kind:
        input.eventType === "presence_tick"
          ? "presence_tick"
          : input.eventType === "chat_bonus"
            ? "chat_bonus"
            : "manual_adjustment",
      amount: input.amount,
      source: "streamerbot",
      externalEventId: input.eventId,
      metadata: input.payload,
      createdAt: new Date(input.occurredAt),
    });

    return {
      mode: "database" as const,
      deduped: false,
      eventLogInserted: true,
      viewerCreated,
      balanceUpdated: true,
      ledgerInserted: true,
      linkMatched: false,
      viewerId: viewer.id,
    };
  }

  return {
    mode: "database" as const,
    deduped: false,
    eventLogInserted: true,
    viewerCreated: false,
    balanceUpdated: false,
    ledgerInserted: false,
    linkMatched: false,
    ignoredReason: "missing_amount_or_viewer_external_id",
  };
}

export async function bridgeHeartbeat(input: {
  bridgeId: string;
  machineKey: string;
  label: string;
}) {
  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    const existing = store.bridgeClients.find((entry) => entry.id === input.bridgeId);
    if (existing) {
      existing.lastSeenAt = new Date().toISOString();
      existing.machineKey = input.machineKey;
      existing.label = input.label;
      return existing;
    }
    const created = {
      id: input.bridgeId,
      machineKey: input.machineKey,
      label: input.label,
      lastSeenAt: new Date().toISOString(),
    };
    store.bridgeClients.unshift(created);
    return created;
  }

  await db
    .insert(bridgeClients)
    .values({
      id: input.bridgeId,
      machineKey: input.machineKey,
      label: input.label,
      lastSeenAt: new Date(),
    })
    .onConflictDoUpdate({
      target: bridgeClients.id,
      set: {
        machineKey: input.machineKey,
        label: input.label,
        lastSeenAt: new Date(),
      },
    });
}

export async function bridgePull() {
  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    return store.redemptions
      .filter((entry) => entry.status === "queued")
      .slice(0, 10)
      .map((entry) => ({
        ...entry,
        item: store.catalog.find((item) => item.id === entry.catalogItemId) ?? null,
        viewer: store.viewers.find((viewer) => viewer.id === entry.viewerId) ?? null,
      }));
  }

  const rows = await db
    .select({
      id: redemptions.id,
      viewerId: redemptions.viewerId,
      catalogItemId: redemptions.catalogItemId,
      status: redemptions.status,
      costAtPurchase: redemptions.costAtPurchase,
      requestSource: redemptions.requestSource,
      idempotencyKey: redemptions.idempotencyKey,
      bridgeAttemptCount: redemptions.bridgeAttemptCount,
      claimedByBridgeId: redemptions.claimedByBridgeId,
      queuedAt: redemptions.queuedAt,
      executedAt: redemptions.executedAt,
      failedAt: redemptions.failedAt,
      failureReason: redemptions.failureReason,
      itemName: catalogItems.name,
      itemType: catalogItems.type,
      itemAction: catalogItems.streamerbotActionRef,
      itemArgs: catalogItems.streamerbotArgsTemplate,
      itemPreviewImageUrl: catalogItems.previewImageUrl,
      itemAccentColor: catalogItems.accentColor,
      itemSlug: catalogItems.slug,
      viewerDisplayName: users.youtubeDisplayName,
      viewerChannelId: users.youtubeChannelId,
    })
    .from(redemptions)
    .innerJoin(catalogItems, eq(redemptions.catalogItemId, catalogItems.id))
    .innerJoin(users, eq(redemptions.viewerId, users.id))
    .where(eq(redemptions.status, "queued"))
    .orderBy(redemptions.queuedAt)
    .limit(10);

  return rows.map((entry) => ({
    id: entry.id,
    viewerId: entry.viewerId,
    catalogItemId: entry.catalogItemId,
    status: entry.status as RedemptionRecord["status"],
    costAtPurchase: entry.costAtPurchase,
    requestSource: entry.requestSource,
    idempotencyKey: entry.idempotencyKey,
    bridgeAttemptCount: entry.bridgeAttemptCount,
    claimedByBridgeId: entry.claimedByBridgeId,
    queuedAt: entry.queuedAt.toISOString(),
    executedAt: entry.executedAt?.toISOString() ?? null,
    failedAt: entry.failedAt?.toISOString() ?? null,
    failureReason: entry.failureReason,
    item: {
      id: entry.catalogItemId,
      slug: entry.itemSlug,
      name: entry.itemName,
      description: "",
      type: entry.itemType as CatalogItemRecord["type"],
      cost: entry.costAtPurchase,
      isActive: true,
      globalCooldownSeconds: 0,
      viewerCooldownSeconds: 0,
      stock: null,
      previewImageUrl: entry.itemPreviewImageUrl,
      accentColor: entry.itemAccentColor,
      isFeatured: false,
      streamerbotActionRef: entry.itemAction,
      streamerbotArgsTemplate: entry.itemArgs as Record<string, unknown>,
    },
    viewer: {
      id: entry.viewerId,
      googleUserId: null,
      email: null,
      youtubeChannelId: entry.viewerChannelId,
      youtubeDisplayName: entry.viewerDisplayName,
      avatarUrl: null,
      isLinked: true,
      excludeFromRanking: false,
      createdAt: new Date().toISOString(),
    },
  }));
}

export async function bridgeClaim(redemptionId: string, bridgeId: string) {
  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    const redemption = store.redemptions.find((entry) => entry.id === redemptionId);
    if (!redemption || redemption.status !== "queued") {
      return null;
    }
    redemption.status = "executing";
    redemption.claimedByBridgeId = bridgeId;
    redemption.bridgeAttemptCount += 1;
    return redemption;
  }

  await db
    .update(redemptions)
    .set({
      status: "executing",
      claimedByBridgeId: bridgeId,
      bridgeAttemptCount: sql`${redemptions.bridgeAttemptCount} + 1`,
    })
    .where(eq(redemptions.id, redemptionId));

  const [redemption] = await db.select().from(redemptions).where(eq(redemptions.id, redemptionId)).limit(1);
  return redemption ?? null;
}

export async function bridgeComplete(redemptionId: string) {
  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    const redemption = store.redemptions.find((entry) => entry.id === redemptionId);
    if (!redemption) {
      return null;
    }
    redemption.status = "completed";
    redemption.executedAt = new Date().toISOString();
    return redemption;
  }

  await db
    .update(redemptions)
    .set({
      status: "completed",
      executedAt: new Date(),
    })
    .where(eq(redemptions.id, redemptionId));

  const [redemption] = await db.select().from(redemptions).where(eq(redemptions.id, redemptionId)).limit(1);
  return redemption ?? null;
}

export async function bridgeFail(redemptionId: string, failureReason: string) {
  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    const redemption = store.redemptions.find((entry) => entry.id === redemptionId);
    if (!redemption) {
      return null;
    }

    redemption.status = "failed";
    redemption.failedAt = new Date().toISOString();
    redemption.failureReason = failureReason;

    const balance = getBalance(store, redemption.viewerId);
    balance.currentBalance += redemption.costAtPurchase;
    balance.lastSyncedAt = new Date().toISOString();

    createLedgerEntry(store, {
      viewerId: redemption.viewerId,
      kind: "redemption_refund",
      amount: redemption.costAtPurchase,
      source: "bridge",
      externalEventId: null,
      metadata: { redemptionId, failureReason },
    });
    return redemption;
  }

  const [redemption] = await db.select().from(redemptions).where(eq(redemptions.id, redemptionId)).limit(1);
  if (!redemption) {
    return null;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(redemptions)
      .set({
        status: "failed",
        failedAt: new Date(),
        failureReason,
      })
      .where(eq(redemptions.id, redemptionId));

    await tx
      .update(viewerBalances)
      .set({
        currentBalance: sql`${viewerBalances.currentBalance} + ${redemption.costAtPurchase}`,
        lastSyncedAt: new Date(),
      })
      .where(eq(viewerBalances.viewerId, redemption.viewerId));

    await tx.insert(pointLedger).values({
      id: randomUUID(),
      viewerId: redemption.viewerId,
      kind: "redemption_refund",
      amount: redemption.costAtPurchase,
      source: "bridge",
      externalEventId: null,
      metadata: { redemptionId, failureReason },
    });
  });

  const [updated] = await db.select().from(redemptions).where(eq(redemptions.id, redemptionId)).limit(1);
  return updated ?? null;
}
