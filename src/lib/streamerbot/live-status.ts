import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { googleAccounts, googleAccountViewers, users } from "@/lib/db/schema";
import { adminEmails, env } from "@/lib/env";
import type { StreamerbotEventType } from "@/lib/types";

const LIVE_REQUIRED_EVENT_TYPES: StreamerbotEventType[] = [
  "presence_tick",
  "chat_bonus",
];
const LIVE_STATUS_CACHE_TTL_MS = 15_000;
const LIVE_STATUS_REQUEST_TIMEOUT_MS = 5_000;

type LiveStatusCacheEntry = {
  expiresAt: number;
  isLive: boolean;
};

declare global {
  var __lojaYoutubeLiveStatusCache: Map<string, LiveStatusCacheEntry> | undefined;
  var __lojaYoutubeLiveStatusWarnedMissingKey: boolean | undefined;
  var __lojaYoutubeLiveStatusWarnedMissingChannelIds: boolean | undefined;
}

function getLiveStatusCache() {
  if (!globalThis.__lojaYoutubeLiveStatusCache) {
    globalThis.__lojaYoutubeLiveStatusCache = new Map<string, LiveStatusCacheEntry>();
  }

  return globalThis.__lojaYoutubeLiveStatusCache;
}

function warnOnce(flag: "missingKey" | "missingChannelIds", message: string) {
  if (flag === "missingKey") {
    if (globalThis.__lojaYoutubeLiveStatusWarnedMissingKey) {
      return;
    }
    globalThis.__lojaYoutubeLiveStatusWarnedMissingKey = true;
    console.warn(message);
    return;
  }

  if (globalThis.__lojaYoutubeLiveStatusWarnedMissingChannelIds) {
    return;
  }
  globalThis.__lojaYoutubeLiveStatusWarnedMissingChannelIds = true;
  console.warn(message);
}

function getConfiguredChannelIds() {
  return (env.STREAM_YOUTUBE_CHANNEL_ID ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function resolveTrackedYoutubeChannelIds() {
  const configuredChannelIds = getConfiguredChannelIds();
  if (configuredChannelIds.length > 0) {
    return configuredChannelIds;
  }

  const db = getDb();
  if (!db || adminEmails.size === 0) {
    return [];
  }

  const rows = await db
    .select({
      email: googleAccounts.email,
      youtubeChannelId: users.youtubeChannelId,
    })
    .from(googleAccountViewers)
    .innerJoin(googleAccounts, eq(googleAccountViewers.googleAccountId, googleAccounts.id))
    .innerJoin(users, eq(googleAccountViewers.viewerId, users.id))
    .where(eq(users.isLinked, true));

  const channelIds = new Set<string>();
  for (const row of rows) {
    if (!row.email || !adminEmails.has(row.email.toLowerCase())) {
      continue;
    }

    channelIds.add(row.youtubeChannelId);
  }

  return Array.from(channelIds);
}

async function fetchChannelLiveStatus(channelId: string) {
  const cache = getLiveStatusCache();
  const cached = cache.get(channelId);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.isLive;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LIVE_STATUS_REQUEST_TIMEOUT_MS);

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("channelId", channelId);
    url.searchParams.set("eventType", "live");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "1");
    url.searchParams.set("key", env.YOUTUBE_API_KEY ?? "");

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`youtube_live_status_${response.status}`);
    }

    const payload = (await response.json()) as { items?: unknown[] };
    const isLive = Array.isArray(payload.items) && payload.items.length > 0;
    cache.set(channelId, {
      expiresAt: now + LIVE_STATUS_CACHE_TTL_MS,
      isLive,
    });
    return isLive;
  } catch (error) {
    console.warn("[streamerbot/live] Failed to verify YouTube live status.", {
      channelId,
      error,
    });
    return cached?.isLive ?? false;
  } finally {
    clearTimeout(timeout);
  }
}

export function eventRequiresActiveLivestream(eventType: StreamerbotEventType) {
  return LIVE_REQUIRED_EVENT_TYPES.includes(eventType);
}

export async function resolveRequiredLivestreamState(input?: {
  explicitState?: boolean | null;
}) {
  if (typeof input?.explicitState === "boolean") {
    return input.explicitState;
  }

  return isStreamerbotLivestreamActive();
}

export async function requireActiveLivestream(input?: {
  explicitState?: boolean | null;
  failureError?: string;
}) {
  const isLive = await resolveRequiredLivestreamState({
    explicitState: input?.explicitState ?? null,
  });

  if (!isLive) {
    throw new Error(input?.failureError ?? "livestream_not_live");
  }

  return true;
}

export async function isStreamerbotLivestreamActive() {
  if (!env.YOUTUBE_API_KEY) {
    warnOnce(
      "missingKey",
      "[streamerbot/live] Missing YOUTUBE_API_KEY. Live-gated Streamer.bot events will be ignored.",
    );
    return false;
  }

  const channelIds = await resolveTrackedYoutubeChannelIds();
  if (channelIds.length === 0) {
    warnOnce(
      "missingChannelIds",
      "[streamerbot/live] No tracked YouTube channel ids found. Link an admin account or set STREAM_YOUTUBE_CHANNEL_ID.",
    );
    return false;
  }

  for (const channelId of channelIds) {
    if (await fetchChannelLiveStatus(channelId)) {
      return true;
    }
  }

  return false;
}
