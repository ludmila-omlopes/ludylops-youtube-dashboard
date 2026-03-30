import { randomUUID } from "node:crypto";

import { desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  bridgeClients,
  catalogItems,
  pointLedger,
  redemptions,
  streamerbotBalanceSnapshots,
  streamerbotEventLog,
  users,
  viewerBalances,
  viewerLinks,
} from "@/lib/db/schema";
import {
  demoBalances,
  demoBridgeClients,
  demoCatalog,
  demoLedger,
  demoLinkCodes,
  demoRedemptions,
  demoSnapshots,
  demoViewers,
} from "@/lib/demo-data";
import { isDemoMode } from "@/lib/env";
import { evaluateRedeemability, reconcileSnapshot } from "@/lib/redemptions/service";
import {
  BalanceSnapshotRecord,
  BridgeClientRecord,
  CatalogItemRecord,
  LedgerEntryRecord,
  LinkCodeRecord,
  RedemptionRecord,
  ViewerBalanceRecord,
  ViewerRecord,
} from "@/lib/types";
import { shortCode, slugify } from "@/lib/utils";

type DemoStore = {
  viewers: ViewerRecord[];
  balances: ViewerBalanceRecord[];
  catalog: CatalogItemRecord[];
  ledger: LedgerEntryRecord[];
  redemptions: RedemptionRecord[];
  bridgeClients: BridgeClientRecord[];
  linkCodes: LinkCodeRecord[];
  snapshots: BalanceSnapshotRecord[];
};

declare global {
  var __lojaDemoStore: DemoStore | undefined;
}

function getDemoStore(): DemoStore {
  if (!globalThis.__lojaDemoStore) {
    globalThis.__lojaDemoStore = {
      viewers: structuredClone(demoViewers),
      balances: structuredClone(demoBalances),
      catalog: structuredClone(demoCatalog),
      ledger: structuredClone(demoLedger),
      redemptions: structuredClone(demoRedemptions),
      bridgeClients: structuredClone(demoBridgeClients),
      linkCodes: structuredClone(demoLinkCodes),
      snapshots: structuredClone(demoSnapshots),
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

async function withUserByEmail(email: string) {
  const db = getDb();

  if (isDemoMode || !db) {
    const store = getDemoStore();
    const user = store.viewers.find((viewer) => viewer.email === email) ?? null;
    return user;
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user
    ? {
        id: user.id,
        googleUserId: user.googleUserId,
        email: user.email,
        youtubeChannelId: user.youtubeChannelId,
        youtubeDisplayName: user.youtubeDisplayName,
        avatarUrl: user.avatarUrl,
        isLinked: user.isLinked,
        createdAt: user.createdAt.toISOString(),
      }
    : null;
}

export async function ensureViewerFromSession(input: {
  googleUserId: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
}) {
  if (!input.email) {
    return null;
  }

  const existing = await withUserByEmail(input.email);
  if (existing) {
    return existing;
  }

  const viewer: ViewerRecord = {
    id: randomUUID(),
    googleUserId: input.googleUserId,
    email: input.email,
    youtubeChannelId: null,
    youtubeDisplayName: input.name ?? input.email.split("@")[0],
    avatarUrl: input.image,
    isLinked: false,
    createdAt: new Date().toISOString(),
  };

  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    store.viewers.push(viewer);
    getBalance(store, viewer.id);
    return viewer;
  }

  await db.insert(users).values({
    id: viewer.id,
    googleUserId: viewer.googleUserId,
    email: viewer.email,
    youtubeChannelId: null,
    youtubeDisplayName: viewer.youtubeDisplayName,
    avatarUrl: viewer.avatarUrl,
    isLinked: false,
  });

  await db.insert(viewerBalances).values({
    viewerId: viewer.id,
    currentBalance: 0,
    lifetimeEarned: 0,
    lifetimeSpent: 0,
  });

  return viewer;
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
      avatarUrl: users.avatarUrl,
      currentBalance: viewerBalances.currentBalance,
      lifetimeEarned: viewerBalances.lifetimeEarned,
      lifetimeSpent: viewerBalances.lifetimeSpent,
      lastSyncedAt: viewerBalances.lastSyncedAt,
    })
    .from(users)
    .innerJoin(viewerBalances, eq(users.id, viewerBalances.viewerId))
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

export async function getViewerDashboard(email: string) {
  const user = await withUserByEmail(email);
  if (!user) {
    return null;
  }

  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    const balance = getBalance(store, user.id);
    const redemptions = store.redemptions
      .filter((entry) => entry.viewerId === user.id)
      .sort((a, b) => +new Date(b.queuedAt) - +new Date(a.queuedAt));

    return { viewer: user, balance, redemptions };
  }

  const [balance] = await db.select().from(viewerBalances).where(eq(viewerBalances.viewerId, user.id)).limit(1);
  const history = await db.select().from(redemptions).where(eq(redemptions.viewerId, user.id)).orderBy(desc(redemptions.queuedAt));
  return {
    viewer: user,
    balance: {
      viewerId: user.id,
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

export async function startLinkCode(email: string) {
  const user = await withUserByEmail(email);
  if (!user) {
    return null;
  }

  const created: LinkCodeRecord = {
    id: randomUUID(),
    code: shortCode(),
    userId: user.id,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    claimedAt: null,
  };

  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    store.linkCodes = store.linkCodes.filter((entry) => entry.userId !== user.id);
    store.linkCodes.push(created);
    globalThis.__lojaDemoStore = store;
    return created;
  }

  await db.delete(viewerLinks).where(eq(viewerLinks.userId, user.id));
  await db.insert(viewerLinks).values({
    id: created.id,
    userId: created.userId,
    linkCode: created.code,
    expiresAt: new Date(created.expiresAt),
    claimedAt: null,
  });
  return created;
}

export async function getLinkStatus(email: string) {
  const user = await withUserByEmail(email);
  if (!user) {
    return null;
  }

  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    return store.linkCodes
      .filter((entry) => entry.userId === user.id)
      .sort((a, b) => +new Date(b.expiresAt) - +new Date(a.expiresAt))[0] ?? null;
  }

  const [entry] = await db.select().from(viewerLinks).where(eq(viewerLinks.userId, user.id)).limit(1);
  if (!entry) {
    return null;
  }
  return {
    id: entry.id,
    code: entry.linkCode,
    userId: entry.userId,
    expiresAt: entry.expiresAt.toISOString(),
    claimedAt: entry.claimedAt?.toISOString() ?? null,
  };
}

export async function redeemItem({
  email,
  itemId,
  source,
}: {
  email: string;
  itemId: string;
  source: string;
}) {
  const dashboard = await getViewerDashboard(email);
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
  eventType: "presence_tick" | "chat_bonus" | "manual_adjustment" | "link_code_seen" | "balance_snapshot";
  viewerExternalId?: string;
  youtubeDisplayName?: string;
  amount?: number;
  balance?: number;
  linkCode?: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}) {
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

    if (input.eventType === "link_code_seen" && input.linkCode && input.viewerExternalId) {
      const link = store.linkCodes.find((entry) => entry.code === input.linkCode);
      if (link) {
        link.claimedAt = new Date().toISOString();
        const viewer = store.viewers.find((entry) => entry.id === link.userId);
        if (viewer) {
          viewer.youtubeChannelId = input.viewerExternalId;
          viewer.youtubeDisplayName = input.youtubeDisplayName ?? viewer.youtubeDisplayName;
          viewer.isLinked = true;
        }
      }
      return {
        mode: "demo" as const,
        deduped: false,
        eventLogInserted: false,
        viewerCreated: false,
        balanceUpdated: false,
        ledgerInserted: false,
        linkMatched: Boolean(link),
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

  if (input.eventType === "link_code_seen" && input.linkCode && input.viewerExternalId) {
    const [link] = await db
      .select()
      .from(viewerLinks)
      .where(eq(viewerLinks.linkCode, input.linkCode))
      .limit(1);

    if (link) {
      await db
        .update(viewerLinks)
        .set({
          claimedAt: new Date(),
        })
        .where(eq(viewerLinks.id, link.id));

      await db
        .update(users)
        .set({
          youtubeChannelId: input.viewerExternalId,
          youtubeDisplayName: input.youtubeDisplayName ?? "Viewer vinculado",
          isLinked: true,
        })
        .where(eq(users.id, link.userId));
    }

    return {
      mode: "database" as const,
      deduped: false,
      eventLogInserted: true,
      viewerCreated: false,
      balanceUpdated: false,
      ledgerInserted: false,
      linkMatched: Boolean(link),
    };
  }

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
        avatarUrl: null,
        isLinked: false,
      });
      await db.insert(viewerBalances).values({
        viewerId: newId,
        currentBalance: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
      });
      viewerCreated = true;
      [viewer] = await db.select().from(users).where(eq(users.id, newId)).limit(1);
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

export async function ingestBalanceSnapshot(input: {
  eventId: string;
  occurredAt: string;
  viewers: Array<{ youtubeChannelId: string; youtubeDisplayName: string; balance: number }>;
}) {
  const db = getDb();
  if (isDemoMode || !db) {
    const store = getDemoStore();
    let createdViewers = 0;
    let reconciledBalances = 0;
    for (const entry of input.viewers) {
      let viewer = store.viewers.find((item) => item.youtubeChannelId === entry.youtubeChannelId);
      if (!viewer) {
        viewer = {
          id: randomUUID(),
          googleUserId: null,
          email: null,
          youtubeChannelId: entry.youtubeChannelId,
          youtubeDisplayName: entry.youtubeDisplayName,
          avatarUrl: null,
          isLinked: false,
          createdAt: new Date().toISOString(),
        };
        store.viewers.push(viewer);
        createdViewers += 1;
      }

      const balance = getBalance(store, viewer.id);
      const result = reconcileSnapshot({
        currentBalance: balance.currentBalance,
        incomingBalance: entry.balance,
      });

      if (result.needsAdjust) {
        balance.currentBalance = entry.balance;
        balance.lastSyncedAt = new Date().toISOString();
        reconciledBalances += 1;
        store.snapshots.push({
          viewerId: viewer.id,
          balance: entry.balance,
          sourceEventId: input.eventId,
          createdAt: input.occurredAt,
        });
        createLedgerEntry(store, {
          viewerId: viewer.id,
          kind: "snapshot_reconcile",
          amount: result.delta,
          source: "streamerbot",
          externalEventId: input.eventId,
          metadata: { snapshot: true },
          createdAt: input.occurredAt,
        });
      }
    }
    return {
      mode: "demo" as const,
      processed: input.viewers.length,
      createdViewers,
      reconciledBalances,
      snapshotsInserted: reconciledBalances,
    };
  }

  let createdViewers = 0;
  let reconciledBalances = 0;
  for (const entry of input.viewers) {
    const [viewer] = await db
      .select()
      .from(users)
      .where(eq(users.youtubeChannelId, entry.youtubeChannelId))
      .limit(1);

    if (!viewer) {
      const viewerId = randomUUID();
      await db.insert(users).values({
        id: viewerId,
        googleUserId: null,
        email: null,
        youtubeChannelId: entry.youtubeChannelId,
        youtubeDisplayName: entry.youtubeDisplayName,
        avatarUrl: null,
        isLinked: false,
      });
      await db.insert(viewerBalances).values({
        viewerId,
        currentBalance: entry.balance,
        lifetimeEarned: entry.balance,
        lifetimeSpent: 0,
      });
      await db.insert(streamerbotBalanceSnapshots).values({
        id: randomUUID(),
        viewerId,
        balance: entry.balance,
        sourceEventId: input.eventId,
        createdAt: new Date(input.occurredAt),
      });
      createdViewers += 1;
      continue;
    }

    const [balance] = await db
      .select()
      .from(viewerBalances)
      .where(eq(viewerBalances.viewerId, viewer.id))
      .limit(1);
    const result = reconcileSnapshot({
      currentBalance: balance?.currentBalance ?? 0,
      incomingBalance: entry.balance,
    });

    if (result.needsAdjust) {
      await db
        .update(viewerBalances)
        .set({
          currentBalance: entry.balance,
          lastSyncedAt: new Date(),
        })
        .where(eq(viewerBalances.viewerId, viewer.id));

      await db.insert(pointLedger).values({
        id: randomUUID(),
        viewerId: viewer.id,
        kind: "snapshot_reconcile",
        amount: result.delta,
        source: "streamerbot",
        externalEventId: input.eventId,
        metadata: { snapshot: true },
        createdAt: new Date(input.occurredAt),
      });
      reconciledBalances += 1;
    }

    await db.insert(streamerbotBalanceSnapshots).values({
      id: randomUUID(),
      viewerId: viewer.id,
      balance: entry.balance,
      sourceEventId: input.eventId,
      createdAt: new Date(input.occurredAt),
    });
  }

  return {
    mode: "database" as const,
    processed: input.viewers.length,
    createdViewers,
    reconciledBalances,
    snapshotsInserted: input.viewers.length,
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
