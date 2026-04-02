import { z } from "zod";

export const catalogItemSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(128).optional(),
  description: z.string().min(8).max(500),
  type: z.enum([
    "onscreen_text",
    "play_sound",
    "show_image",
    "overlay_scene_trigger",
    "generic_streamerbot_action",
  ]),
  cost: z.number().int().min(1),
  isActive: z.boolean().default(true),
  globalCooldownSeconds: z.number().int().min(0).default(0),
  viewerCooldownSeconds: z.number().int().min(0).default(0),
  stock: z.number().int().min(0).nullable().default(null),
  previewImageUrl: z.string().url().nullable().default(null),
  accentColor: z.string().min(4).max(16).default("#b4ff39"),
  isFeatured: z.boolean().default(false),
  streamerbotActionRef: z.string().min(2).max(255),
  streamerbotArgsTemplate: z.record(z.string(), z.unknown()).default({}),
});

export const redeemSchema = z.object({
  itemId: z.string().min(1),
  source: z.string().default("web"),
});

export const placeBetSchema = z.object({
  optionId: z.string().min(1),
  amount: z.number().int().min(1),
  source: z.string().default("web"),
});

export const streamerbotChatBetSchema = z
  .object({
    viewerExternalId: z.string().min(1),
    youtubeDisplayName: z.string().min(1).optional(),
    youtubeHandle: z.string().min(1).optional(),
    betId: z.string().min(1).optional(),
    optionId: z.string().min(1).optional(),
    optionIndex: z.number().int().min(1).optional(),
    optionLabel: z.string().min(1).optional(),
    amount: z.number().int().min(1),
    source: z.string().default("streamerbot_chat"),
  })
  .refine((value) => value.optionId || value.optionIndex || value.optionLabel, {
    message: "Option selector is required.",
    path: ["optionId"],
  });

export const setActiveViewerSchema = z.object({
  viewerId: z.string().min(1),
});

export const createBetSchema = z.object({
  question: z.string().min(6).max(255),
  closesAt: z.string().datetime(),
  options: z.array(z.string().min(1).max(255)).min(2).max(6),
  startOpen: z.boolean().default(true),
});

export const resolveBetSchema = z.object({
  winningOptionId: z.string().min(1),
});

export const manualAdjustSchema = z.object({
  amount: z.number().int().refine((value) => value !== 0, {
    message: "Amount cannot be zero.",
  }),
  reason: z.string().min(3).max(255),
});

export const streamerbotEventSchema = z.object({
  eventId: z.string().min(3),
  eventType: z.enum(["presence_tick", "chat_bonus", "manual_adjustment"]),
  viewerExternalId: z.string().min(1).optional(),
  youtubeDisplayName: z.string().min(1).optional(),
  youtubeHandle: z.string().min(1).optional(),
  amount: z.number().int().optional(),
  balance: z.number().int().optional(),
  occurredAt: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const bridgeHeartbeatSchema = z.object({
  bridgeId: z.string().min(1),
  machineKey: z.string().min(1),
  label: z.string().min(1),
});

export const bridgeClaimSchema = z.object({
  bridgeId: z.string().min(1),
});

export const bridgeCompleteSchema = z.object({
  bridgeId: z.string().min(1),
  executionNote: z.string().max(255).optional(),
});

export const bridgeFailSchema = z.object({
  bridgeId: z.string().min(1),
  failureReason: z.string().min(3).max(255),
});
