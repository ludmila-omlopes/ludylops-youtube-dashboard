import { CatalogItemRecord, RedemptionRecord } from "@/lib/types";

export function isBridgeOnline(lastSeenAt: string | null | undefined, now = Date.now()) {
  if (!lastSeenAt) {
    return false;
  }

  return now - new Date(lastSeenAt).getTime() < 45_000;
}

export function evaluateRedeemability({
  item,
  balance,
  recentViewerRedemptions,
  recentGlobalRedemptions,
}: {
  item: CatalogItemRecord;
  balance: number;
  recentViewerRedemptions: RedemptionRecord[];
  recentGlobalRedemptions: RedemptionRecord[];
}) {
  if (!item.isActive) {
    return { canRedeem: false, reason: "indisponivel" as const };
  }

  if (balance < item.cost) {
    return { canRedeem: false, reason: "saldo_insuficiente" as const };
  }

  const now = Date.now();
  const latestViewer = recentViewerRedemptions[0];
  const latestGlobal = recentGlobalRedemptions[0];

  if (
    latestViewer &&
    now - new Date(latestViewer.queuedAt).getTime() <
      item.viewerCooldownSeconds * 1000
  ) {
    return { canRedeem: false, reason: "cooldown_viewer" as const };
  }

  if (
    latestGlobal &&
    now - new Date(latestGlobal.queuedAt).getTime() <
      item.globalCooldownSeconds * 1000
  ) {
    return { canRedeem: false, reason: "cooldown_global" as const };
  }

  if (item.stock !== null && item.stock <= 0) {
    return { canRedeem: false, reason: "sem_estoque" as const };
  }

  return { canRedeem: true, reason: "ok" as const };
}

export function reconcileSnapshot({
  currentBalance,
  incomingBalance,
}: {
  currentBalance: number;
  incomingBalance: number;
}) {
  return {
    delta: incomingBalance - currentBalance,
    needsAdjust: incomingBalance !== currentBalance,
  };
}
