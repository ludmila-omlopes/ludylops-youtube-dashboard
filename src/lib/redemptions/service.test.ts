import { evaluateRedeemability, reconcileSnapshot } from "@/lib/redemptions/service";
import { CatalogItemRecord, RedemptionRecord } from "@/lib/types";

const item: CatalogItemRecord = {
  id: "item_1",
  slug: "teste",
  name: "Teste",
  description: "Item de teste",
  type: "play_sound",
  cost: 100,
  isActive: true,
  globalCooldownSeconds: 30,
  viewerCooldownSeconds: 60,
  stock: 3,
  previewImageUrl: null,
  accentColor: "#b4ff39",
  isFeatured: false,
  streamerbotActionRef: "Play Approved Sound",
  streamerbotArgsTemplate: {},
};

const recentRedemption: RedemptionRecord = {
  id: "red",
  viewerId: "viewer",
  catalogItemId: "item_1",
  status: "completed",
  costAtPurchase: 100,
  requestSource: "web",
  idempotencyKey: "idem",
  bridgeAttemptCount: 1,
  claimedByBridgeId: "bridge",
  queuedAt: new Date().toISOString(),
  executedAt: new Date().toISOString(),
  failedAt: null,
  failureReason: null,
};

describe("evaluateRedeemability", () => {
  it("blocks when the viewer does not have enough balance", () => {
    expect(
      evaluateRedeemability({
        item,
        balance: 10,
        recentViewerRedemptions: [],
        recentGlobalRedemptions: [],
      }),
    ).toEqual({
      canRedeem: false,
      reason: "saldo_insuficiente",
    });
  });

  it("blocks when the viewer cooldown is active", () => {
    expect(
      evaluateRedeemability({
        item,
        balance: 500,
        recentViewerRedemptions: [recentRedemption],
        recentGlobalRedemptions: [],
      }),
    ).toEqual({
      canRedeem: false,
      reason: "cooldown_viewer",
    });
  });
});

describe("reconcileSnapshot", () => {
  it("computes the balance delta for reconciliation", () => {
    expect(
      reconcileSnapshot({
        currentBalance: 120,
        incomingBalance: 150,
      }),
    ).toEqual({
      delta: 30,
      needsAdjust: true,
    });
  });
});
