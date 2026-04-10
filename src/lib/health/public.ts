import type { PublicAuthHealth } from "@/lib/auth/public-health";
import { isBridgeOnline } from "@/lib/redemptions/service";
import type { BridgeClientRecord } from "@/lib/types";

export type PublicHealthSnapshot = {
  status: "ok" | "degraded";
  mode: "demo" | "database";
  now: string;
  database: {
    configured: boolean;
    ready: boolean;
    status: "demo" | "ready" | "error";
  };
  auth: PublicAuthHealth;
  bridge: {
    ready: boolean;
    status: "online" | "offline" | "missing" | "error";
    clientCount: number;
    mostRecentHeartbeatAt: string | null;
    mostRecentHeartbeatAgeSeconds: number | null;
  };
  failures: string[];
  warnings: string[];
};

function getBridgeAgeSeconds(lastSeenAt: string | null, now: Date) {
  if (!lastSeenAt) {
    return null;
  }

  const ageMs = now.getTime() - new Date(lastSeenAt).getTime();
  return Math.max(0, Math.round(ageMs / 1000));
}

export function buildPublicHealthSnapshot(input: {
  mode: "demo" | "database";
  auth: PublicAuthHealth;
  bridge: BridgeClientRecord[];
  bridgeQueryFailed?: boolean;
  now?: Date;
}): PublicHealthSnapshot {
  const now = input.now ?? new Date();
  const currentBridge = input.bridge[0] ?? null;
  const bridgeReady = Boolean(currentBridge && isBridgeOnline(currentBridge.lastSeenAt, now.getTime()));
  const bridgeStatus = input.bridgeQueryFailed
    ? "error"
    : !currentBridge
      ? "missing"
      : bridgeReady
        ? "online"
        : "offline";
  const failures = [
    ...input.auth.failures.map((failure) => `auth:${failure}`),
    ...(input.bridgeQueryFailed ? ["database:bridge_status_unavailable"] : []),
  ];

  return {
    status: failures.length === 0 ? "ok" : "degraded",
    mode: input.mode,
    now: now.toISOString(),
    database: {
      configured: input.mode === "database",
      ready: input.mode === "demo" || !input.bridgeQueryFailed,
      status: input.mode === "demo" ? "demo" : input.bridgeQueryFailed ? "error" : "ready",
    },
    auth: input.auth,
    bridge: {
      ready: bridgeReady,
      status: bridgeStatus,
      clientCount: input.bridge.length,
      mostRecentHeartbeatAt: currentBridge?.lastSeenAt ?? null,
      mostRecentHeartbeatAgeSeconds: getBridgeAgeSeconds(currentBridge?.lastSeenAt ?? null, now),
    },
    failures,
    warnings: [...input.auth.warnings],
  };
}
