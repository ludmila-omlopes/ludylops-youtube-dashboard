import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  canBootstrapViewerFromYoutubeLookup,
  getYoutubeChannelFromGoogleAccessToken,
  getYoutubeChannelLookupMessage,
} from "@/lib/google/youtube-channel";

describe("getYoutubeChannelFromGoogleAccessToken", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns channels_found when the API resolves channels", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "UC_REAL",
            snippet: {
              title: "caiovinnic",
              customUrl: "caiovinnic",
            },
          },
        ],
      }),
    });

    const result = await getYoutubeChannelFromGoogleAccessToken("token");

    expect(result.status).toEqual({
      kind: "channels_found",
      channelCount: 1,
    });
    expect(result.channels).toEqual([
      {
        youtubeChannelId: "UC_REAL",
        youtubeDisplayName: "caiovinnic",
        youtubeHandle: "@caiovinnic",
      },
    ]);
    expect(canBootstrapViewerFromYoutubeLookup(result)).toBe(true);
    expect(getYoutubeChannelLookupMessage(result.status)).toBeNull();
  });

  it("returns empty when the API succeeds but no channels are returned", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [],
      }),
    });

    const result = await getYoutubeChannelFromGoogleAccessToken("token");

    expect(result.status).toEqual({
      kind: "empty",
    });
    expect(result.channels).toEqual([]);
    expect(canBootstrapViewerFromYoutubeLookup(result)).toBe(false);
  });

  it("detects when the granted scopes do not include youtube.readonly", async () => {
    const result = await getYoutubeChannelFromGoogleAccessToken("token", {
      grantedScope: "openid email profile",
    });

    expect(result.status).toEqual({
      kind: "scope_missing",
      grantedScopes: ["openid", "email", "profile"],
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(canBootstrapViewerFromYoutubeLookup(result)).toBe(false);
  });

  it("classifies 401 mine lookups as authorization_required", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          errors: [{ reason: "authorizationRequired" }],
        },
      }),
    });

    const result = await getYoutubeChannelFromGoogleAccessToken("token");

    expect(result.status).toEqual({
      kind: "authorization_required",
      httpStatus: 401,
      errorReason: "authorizationRequired",
    });
  });

  it("classifies 403 permission failures as insufficient_permissions", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          errors: [{ reason: "insufficientPermissions" }],
        },
      }),
    });

    const result = await getYoutubeChannelFromGoogleAccessToken("token");

    expect(result.status).toEqual({
      kind: "insufficient_permissions",
      httpStatus: 403,
      errorReason: "insufficientPermissions",
    });
  });

  it("classifies thrown fetch failures as network_error", async () => {
    fetchMock.mockRejectedValue(new Error("fetch failed"));

    const result = await getYoutubeChannelFromGoogleAccessToken("token");

    expect(result.status).toEqual({
      kind: "network_error",
      errorMessage: "fetch failed",
    });
    expect(canBootstrapViewerFromYoutubeLookup(result)).toBe(false);
  });
});
