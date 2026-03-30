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

export const manualAdjustSchema = z.object({
  amount: z.number().int().refine((value) => value !== 0, {
    message: "Amount cannot be zero.",
  }),
  reason: z.string().min(3).max(255),
});

export const streamerbotEventSchema = z.object({
  eventId: z.string().min(3),
  eventType: z.enum([
    "presence_tick",
    "chat_bonus",
    "manual_adjustment",
    "link_code_seen",
    "balance_snapshot",
  ]),
  viewerExternalId: z.string().min(1).optional(),
  youtubeDisplayName: z.string().min(1).optional(),
  amount: z.number().int().optional(),
  balance: z.number().int().optional(),
  linkCode: z.string().optional(),
  occurredAt: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const snapshotSchema = z.object({
  eventId: z.string().min(3),
  occurredAt: z.string().datetime(),
  viewers: z.array(
    z.object({
      youtubeChannelId: z.string().min(1),
      youtubeDisplayName: z.string().min(1),
      balance: z.number().int().min(0),
    }),
  ),
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
