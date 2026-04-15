import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.hoisted(() => vi.fn());
const envMock = vi.hoisted(() => ({
  YOUTUBE_API_KEY: undefined as string | undefined,
  STREAM_YOUTUBE_CHANNEL_ID: undefined as string | undefined,
}));
const adminEmailsMock = vi.hoisted(() => new Set<string>());

vi.mock("@/lib/db/client", () => ({
  getDb: getDbMock,
}));

vi.mock("@/lib/env", () => ({
  env: envMock,
  adminEmails: adminEmailsMock,
}));

describe("live status manual override", () => {
  beforeEach(() => {
    vi.resetModules();
    getDbMock.mockReset();
    getDbMock.mockReturnValue(null);
    envMock.YOUTUBE_API_KEY = undefined;
    envMock.STREAM_YOUTUBE_CHANNEL_ID = undefined;
    adminEmailsMock.clear();
    delete (globalThis as typeof globalThis & {
      __lojaManualLivestreamOverride?: unknown;
      __lojaYoutubeLiveStatusCache?: unknown;
    }).__lojaManualLivestreamOverride;
    delete (globalThis as typeof globalThis & {
      __lojaManualLivestreamOverride?: unknown;
      __lojaYoutubeLiveStatusCache?: unknown;
      __lojaYoutubeLiveStatusWarnedMissingKey?: unknown;
      __lojaYoutubeLiveStatusWarnedMissingChannelIds?: unknown;
    }).__lojaYoutubeLiveStatusCache;
    delete (globalThis as typeof globalThis & {
      __lojaManualLivestreamOverride?: unknown;
      __lojaYoutubeLiveStatusCache?: unknown;
      __lojaYoutubeLiveStatusWarnedMissingKey?: unknown;
      __lojaYoutubeLiveStatusWarnedMissingChannelIds?: unknown;
    }).__lojaYoutubeLiveStatusWarnedMissingKey;
    delete (globalThis as typeof globalThis & {
      __lojaManualLivestreamOverride?: unknown;
      __lojaYoutubeLiveStatusCache?: unknown;
      __lojaYoutubeLiveStatusWarnedMissingKey?: unknown;
      __lojaYoutubeLiveStatusWarnedMissingChannelIds?: unknown;
    }).__lojaYoutubeLiveStatusWarnedMissingChannelIds;
    vi.restoreAllMocks();
  });

  it("prefers the manual override over automatic detection", async () => {
    const liveStatusModule = await import("@/lib/streamerbot/live-status");

    await liveStatusModule.setStreamerbotLivestreamManualOverride({
      isLive: true,
      updatedBy: "admin@example.com",
    });

    const status = await liveStatusModule.getStreamerbotLivestreamStatus();

    expect(status).toMatchObject({
      isLive: true,
      source: "manual",
      manualOverride: {
        isLive: true,
        updatedBy: "admin@example.com",
      },
    });
    await expect(liveStatusModule.isStreamerbotLivestreamActive()).resolves.toBe(true);
  });

  it("returns to automatic detection after clearing the override", async () => {
    envMock.YOUTUBE_API_KEY = "youtube-key";
    envMock.STREAM_YOUTUBE_CHANNEL_ID = "channel-123";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [{ id: { videoId: "video-1" } }],
        }),
      }),
    );

    const liveStatusModule = await import("@/lib/streamerbot/live-status");

    await liveStatusModule.setStreamerbotLivestreamManualOverride({
      isLive: false,
      updatedBy: "admin@example.com",
    });

    const clearedStatus = await liveStatusModule.clearStreamerbotLivestreamManualOverride();

    expect(clearedStatus).toMatchObject({
      isLive: true,
      source: "automatic",
      manualOverride: null,
    });
  });

  it("falls back to automatic offline status when the counter schema is missing and YouTube returns 403", async () => {
    envMock.YOUTUBE_API_KEY = "youtube-key";
    envMock.STREAM_YOUTUBE_CHANNEL_ID = "channel-123";

    const missingSchemaError = new Error(
      'Failed query: select "value" from "streamerbot_counters" where "streamerbot_counters" does not exist',
    );

    getDbMock.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => {
              throw missingSchemaError;
            },
          }),
        }),
      }),
    });

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      }),
    );

    const liveStatusModule = await import("@/lib/streamerbot/live-status");
    const status = await liveStatusModule.getStreamerbotLivestreamStatus();

    expect(status).toEqual({
      isLive: false,
      source: "automatic",
      manualOverride: null,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "[streamerbot/live] Failed to verify YouTube live status.",
      expect.objectContaining({
        channelId: "channel-123",
      }),
    );
  });

  it("shows a clear error when forcing live status without the counter schema", async () => {
    const missingSchemaError = new Error(
      'Failed query: relation "streamerbot_counters" does not exist',
    );

    getDbMock.mockReturnValue({
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: async () => {
            throw missingSchemaError;
          },
        }),
      }),
    });

    const liveStatusModule = await import("@/lib/streamerbot/live-status");

    await expect(
      liveStatusModule.setStreamerbotLivestreamManualOverride({
        isLive: true,
        updatedBy: "admin@example.com",
      }),
    ).rejects.toThrow("Schema dos contadores ainda nao foi aplicado. Rode npm run db:push.");
  });
});
