export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

export type StreamerbotActionRef = {
  id?: string;
  name?: string;
};

export type RedemptionPayload = {
  id: string;
  catalogItemId: string;
  viewerId: string;
  viewer: {
    youtubeDisplayName: string;
  } | null;
  costAtPurchase: number;
  item: {
    slug: string;
    streamerbotActionRef: string;
    streamerbotArgsTemplate?: Record<string, Json>;
  } | null;
};

export type PullQueueResponse = {
  ok: true;
  data: RedemptionPayload[];
};

export type HeartbeatResponse = {
  ok: true;
  data: {
    id: string;
    machineKey: string;
    label: string;
    lastSeenAt: string;
  };
};

export type ClaimResponse = {
  ok: true;
  data: {
    id: string;
    status: string;
  } | null;
};

export type ApiErrorShape = {
  error?: string;
  message?: string;
};

export type BridgeHeartbeatBody = {
  bridgeId: string;
  machineKey: string;
  label: string;
};

export type CompleteBody = {
  bridgeId: string;
  executionNote: string;
};

export type FailBody = {
  bridgeId: string;
  failureReason: string;
};
