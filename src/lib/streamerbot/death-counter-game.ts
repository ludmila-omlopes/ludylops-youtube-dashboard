import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { streamerbotCounters } from "@/lib/db/schema";
import type { ActiveDeathCounterGameRecord } from "@/lib/types";
import { slugify } from "@/lib/utils";

const ACTIVE_DEATH_COUNTER_GAME_KEY = "death_counter_active_game";

declare global {
  var __lojaActiveDeathCounterGame: ActiveDeathCounterGameRecord | null | undefined;
}

function getDemoActiveDeathCounterGame() {
  return globalThis.__lojaActiveDeathCounterGame ?? null;
}

function setDemoActiveDeathCounterGame(config: ActiveDeathCounterGameRecord | null) {
  globalThis.__lojaActiveDeathCounterGame = config;
}

function isMissingCounterSchemaError(error: unknown) {
  const tableNames = ['"streamerbot_counters"', "streamerbot_counters"];
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
    const mentionsTable = tableNames.some((tableName) => normalized.includes(tableName));

    if (
      mentionsTable &&
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

function parseActiveDeathCounterGameRow(
  row:
    | {
        updatedAt: Date;
        metadata: Record<string, unknown>;
      }
    | {
        updatedAt: string;
        metadata: Record<string, unknown>;
      },
): ActiveDeathCounterGameRecord | null {
  if (row.metadata.scopeType !== "game") {
    return null;
  }

  const scopeKey =
    typeof row.metadata.scopeKey === "string" ? row.metadata.scopeKey.trim().toLowerCase() : "";
  const scopeLabel =
    typeof row.metadata.scopeLabel === "string" ? row.metadata.scopeLabel.trim() : "";

  if (!scopeKey || !scopeLabel) {
    return null;
  }

  const metadataUpdatedAt = row.metadata.updatedAt;
  const updatedAt =
    typeof metadataUpdatedAt === "string"
      ? metadataUpdatedAt
      : typeof row.updatedAt === "string"
        ? row.updatedAt
        : row.updatedAt.toISOString();

  return {
    scopeType: "game",
    scopeKey,
    scopeLabel,
    updatedAt,
    updatedBy:
      typeof row.metadata.updatedBy === "string" ? row.metadata.updatedBy : null,
  };
}

function normalizeGameName(gameName: string) {
  const scopeLabel = gameName.trim();
  const scopeKey = slugify(scopeLabel);

  if (!scopeLabel || !scopeKey) {
    throw new Error("Nome do jogo invalido.");
  }

  return { scopeKey, scopeLabel };
}

export async function getActiveDeathCounterGame(): Promise<ActiveDeathCounterGameRecord | null> {
  const db = getDb();
  if (!db) {
    return getDemoActiveDeathCounterGame();
  }

  let row:
    | {
        updatedAt: Date;
        metadata: unknown;
      }
    | undefined;

  try {
    [row] = await db
      .select({
        updatedAt: streamerbotCounters.updatedAt,
        metadata: streamerbotCounters.metadata,
      })
      .from(streamerbotCounters)
      .where(eq(streamerbotCounters.key, ACTIVE_DEATH_COUNTER_GAME_KEY))
      .limit(1);
  } catch (error) {
    if (isMissingCounterSchemaError(error)) {
      return null;
    }
    throw error;
  }

  if (!row) {
    return null;
  }

  return parseActiveDeathCounterGameRow({
    updatedAt: row.updatedAt,
    metadata: row.metadata as Record<string, unknown>,
  });
}

export async function setActiveDeathCounterGame(input: {
  gameName: string;
  updatedBy?: string | null;
}) {
  const config = normalizeGameName(input.gameName);
  const nextConfig: ActiveDeathCounterGameRecord = {
    scopeType: "game",
    scopeKey: config.scopeKey,
    scopeLabel: config.scopeLabel,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy ?? null,
  };
  const db = getDb();

  if (!db) {
    setDemoActiveDeathCounterGame(nextConfig);
    return nextConfig;
  }

  try {
    await db
      .insert(streamerbotCounters)
      .values({
        key: ACTIVE_DEATH_COUNTER_GAME_KEY,
        value: 1,
        lastResetAt: null,
        updatedAt: new Date(nextConfig.updatedAt),
        metadata: {
          scopeType: nextConfig.scopeType,
          scopeKey: nextConfig.scopeKey,
          scopeLabel: nextConfig.scopeLabel,
          updatedAt: nextConfig.updatedAt,
          updatedBy: nextConfig.updatedBy,
        },
      })
      .onConflictDoUpdate({
        target: streamerbotCounters.key,
        set: {
          value: 1,
          updatedAt: new Date(nextConfig.updatedAt),
          metadata: {
            scopeType: nextConfig.scopeType,
            scopeKey: nextConfig.scopeKey,
            scopeLabel: nextConfig.scopeLabel,
            updatedAt: nextConfig.updatedAt,
            updatedBy: nextConfig.updatedBy,
          },
        },
      });
  } catch (error) {
    if (isMissingCounterSchemaError(error)) {
      throw new Error("Schema dos contadores ainda nao foi aplicado. Rode npm run db:push.");
    }
    throw error;
  }

  return nextConfig;
}

export async function clearActiveDeathCounterGame() {
  const db = getDb();
  if (!db) {
    setDemoActiveDeathCounterGame(null);
    return null;
  }

  try {
    await db
      .delete(streamerbotCounters)
      .where(eq(streamerbotCounters.key, ACTIVE_DEATH_COUNTER_GAME_KEY));
  } catch (error) {
    if (isMissingCounterSchemaError(error)) {
      throw new Error("Schema dos contadores ainda nao foi aplicado. Rode npm run db:push.");
    }
    throw error;
  }

  return null;
}
