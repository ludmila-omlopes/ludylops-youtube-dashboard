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

const now = new Date();

export const demoViewers: ViewerRecord[] = [
  {
    id: "viewer_ana",
    googleUserId: "google_ana",
    email: "ana@example.com",
    youtubeChannelId: "yt_ana",
    youtubeDisplayName: "Ana Neon",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    isLinked: true,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 4).toISOString(),
  },
  {
    id: "viewer_caio",
    googleUserId: "google_caio",
    email: "caio@example.com",
    youtubeChannelId: "yt_caio",
    youtubeDisplayName: "Caio CRT",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    isLinked: true,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(),
  },
  {
    id: "viewer_lia",
    googleUserId: null,
    email: null,
    youtubeChannelId: "yt_lia",
    youtubeDisplayName: "Lia Pixel",
    avatarUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    isLinked: false,
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 12).toISOString(),
  },
];

export const demoBalances: ViewerBalanceRecord[] = [
  {
    viewerId: "viewer_ana",
    currentBalance: 1420,
    lifetimeEarned: 1880,
    lifetimeSpent: 460,
    lastSyncedAt: now.toISOString(),
  },
  {
    viewerId: "viewer_caio",
    currentBalance: 980,
    lifetimeEarned: 1260,
    lifetimeSpent: 280,
    lastSyncedAt: now.toISOString(),
  },
  {
    viewerId: "viewer_lia",
    currentBalance: 520,
    lifetimeEarned: 620,
    lifetimeSpent: 100,
    lastSyncedAt: now.toISOString(),
  },
];

export const demoCatalog: CatalogItemRecord[] = [
  {
    id: "item_horn",
    slug: "buzina-neon",
    name: "Buzina Neon",
    description: "Toca uma vinheta curta para cortar o caos da live.",
    type: "play_sound",
    cost: 180,
    isActive: true,
    globalCooldownSeconds: 15,
    viewerCooldownSeconds: 60,
    stock: null,
    previewImageUrl:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
    accentColor: "#b4ff39",
    isFeatured: true,
    streamerbotActionRef: "Play Approved Sound",
    streamerbotArgsTemplate: { soundKey: "neon_horn" },
  },
  {
    id: "item_flash",
    slug: "flash-na-tela",
    name: "Flash na Tela",
    description: "Aciona um overlay agressivo no palco digital.",
    type: "overlay_scene_trigger",
    cost: 250,
    isActive: true,
    globalCooldownSeconds: 25,
    viewerCooldownSeconds: 90,
    stock: null,
    previewImageUrl:
      "https://images.unsplash.com/photo-1520034475321-cbe63696469a?auto=format&fit=crop&w=900&q=80",
    accentColor: "#00e7ff",
    isFeatured: true,
    streamerbotActionRef: "Trigger Overlay Scene",
    streamerbotArgsTemplate: { sceneKey: "flash_brutalist" },
  },
  {
    id: "item_sticker",
    slug: "sticker-holografico",
    name: "Sticker Holográfico",
    description: "Mostra uma arte aprovada no overlay por alguns segundos.",
    type: "show_image",
    cost: 320,
    isActive: true,
    globalCooldownSeconds: 20,
    viewerCooldownSeconds: 120,
    stock: 20,
    previewImageUrl:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
    accentColor: "#ff46e0",
    isFeatured: false,
    streamerbotActionRef: "Show Approved Image",
    streamerbotArgsTemplate: { imageKey: "holo_sticker" },
  },
];

export const demoLedger: LedgerEntryRecord[] = [
  {
    id: "ledger_1",
    viewerId: "viewer_ana",
    kind: "presence_tick",
    amount: 5,
    source: "streamerbot",
    externalEventId: "evt_presence_1",
    metadata: { liveId: "live_demo" },
    createdAt: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "ledger_2",
    viewerId: "viewer_caio",
    kind: "chat_bonus",
    amount: 2,
    source: "streamerbot",
    externalEventId: "evt_chat_1",
    metadata: { liveId: "live_demo" },
    createdAt: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
  },
];

export const demoRedemptions: RedemptionRecord[] = [
  {
    id: "red_1",
    viewerId: "viewer_ana",
    catalogItemId: "item_horn",
    status: "completed",
    costAtPurchase: 180,
    requestSource: "web",
    idempotencyKey: "idem_red_1",
    bridgeAttemptCount: 1,
    claimedByBridgeId: "bridge_local",
    queuedAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
    executedAt: new Date(now.getTime() - 1000 * 60 * 29).toISOString(),
    failedAt: null,
    failureReason: null,
  },
  {
    id: "red_2",
    viewerId: "viewer_caio",
    catalogItemId: "item_flash",
    status: "queued",
    costAtPurchase: 250,
    requestSource: "web",
    idempotencyKey: "idem_red_2",
    bridgeAttemptCount: 0,
    claimedByBridgeId: null,
    queuedAt: new Date(now.getTime() - 1000 * 60).toISOString(),
    executedAt: null,
    failedAt: null,
    failureReason: null,
  },
];

export const demoBridgeClients: BridgeClientRecord[] = [
  {
    id: "bridge_local",
    machineKey: "dev-machine",
    label: "PC da Stream",
    lastSeenAt: now.toISOString(),
  },
];

export const demoLinkCodes: LinkCodeRecord[] = [];
export const demoSnapshots: BalanceSnapshotRecord[] = [];

// ── Bets (mock) ──

export interface DemoBetOption {
  id: string;
  label: string;
  poolAmount: number;
}

export interface DemoBet {
  id: string;
  question: string;
  status: "open" | "locked" | "resolved" | "cancelled";
  deadline: Date;
  totalPool: number;
  winningOptionId?: string;
  options: DemoBetOption[];
}

export const demoBets: DemoBet[] = [
  {
    id: "bet-1",
    question: "Ela vai zerar o boss sem morrer?",
    status: "open",
    deadline: new Date(Date.now() + 2 * 60 * 60 * 1000),
    totalPool: 4650,
    options: [
      { id: "opt-1a", label: "Sim, first try!", poolAmount: 1250 },
      { id: "opt-1b", label: "Vai morrer pelo menos 3x", poolAmount: 3400 },
    ],
  },
  {
    id: "bet-2",
    question: "Quanto tempo ate zerar o jogo?",
    status: "resolved",
    deadline: new Date(Date.now() - 24 * 60 * 60 * 1000),
    totalPool: 8200,
    winningOptionId: "opt-2b",
    options: [
      { id: "opt-2a", label: "Menos de 5h", poolAmount: 2100 },
      { id: "opt-2b", label: "5-10h", poolAmount: 4800 },
      { id: "opt-2c", label: "Mais de 10h", poolAmount: 1300 },
    ],
  },
  {
    id: "bet-3",
    question: "Vai achar o item secreto na live de hoje?",
    status: "open",
    deadline: new Date(Date.now() + 45 * 60 * 1000),
    totalPool: 1820,
    options: [
      { id: "opt-3a", label: "Acha facil", poolAmount: 320 },
      { id: "opt-3b", label: "Demora mas acha", poolAmount: 980 },
      { id: "opt-3c", label: "Nem encontra", poolAmount: 520 },
    ],
  },
];

// ── Game Suggestions (mock) ──

export interface DemoGameSuggestion {
  id: string;
  name: string;
  description: string;
  linkUrl?: string;
  totalVotes: number;
  status: "open" | "accepted" | "played" | "rejected";
  suggestedBy: string;
}

export const demoGameSuggestions: DemoGameSuggestion[] = [
  {
    id: "gs-1",
    name: "Hollow Knight: Silksong",
    description: "Quando sair, bora de day one!",
    totalVotes: 3200,
    status: "open",
    suggestedBy: "Ana Neon",
  },
  {
    id: "gs-2",
    name: "Celeste",
    description: "Platformer indie que vai te fazer chorar e xingar ao mesmo tempo",
    totalVotes: 1800,
    status: "accepted",
    suggestedBy: "Caio CRT",
  },
  {
    id: "gs-3",
    name: "Elden Ring DLC",
    description: "Shadow of the Erdtree, pra sofrer junto",
    totalVotes: 2950,
    status: "played",
    suggestedBy: "Lia Pixel",
  },
  {
    id: "gs-4",
    name: "Hades II",
    description: "Early access ja ta incrivel",
    totalVotes: 1200,
    status: "open",
    suggestedBy: "Caio CRT",
  },
  {
    id: "gs-5",
    name: "Outer Wilds",
    description: "Melhor jogo de exploracao que existe. Sem spoilers!",
    totalVotes: 890,
    status: "open",
    suggestedBy: "Ana Neon",
  },
];
