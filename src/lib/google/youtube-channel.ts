import { normalizeYoutubeHandle } from "@/lib/youtube/identity";

type YoutubeChannelsListResponse = {
  nextPageToken?: string;
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      customUrl?: string;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{
      reason?: string;
      message?: string;
    }>;
  };
};

export type YoutubeChannelIdentity = {
  youtubeChannelId: string;
  youtubeDisplayName: string;
  youtubeHandle: string | null;
};

export async function getYoutubeChannelFromGoogleAccessToken(
  accessToken: string,
  input?: { grantedScope?: string | null },
): Promise<YoutubeChannelLookupResult> {
  const grantedScopes = parseScopes(input?.grantedScope);
  if (grantedScopes.length > 0 && !grantedScopes.includes(YOUTUBE_READONLY_SCOPE)) {
    const status: YoutubeChannelLookupStatus = {
      kind: "scope_missing",
      grantedScopes,
    };
    console.warn("[google/youtube-channel] Missing youtube.readonly scope for OAuth token.", {
      grantedScopes,
    });
    return {
      channels: [],
      status,
    };
  }

  const channels: YoutubeChannelIdentity[] = [];
  const seen = new Set<string>();
  let nextPageToken: string | undefined;

  try {
    do {
      const url = new URL("https://www.googleapis.com/youtube/v3/channels");
      url.searchParams.set("part", "id,snippet");
      url.searchParams.set("mine", "true");
      url.searchParams.set("maxResults", "50");
      if (nextPageToken) {
        url.searchParams.set("pageToken", nextPageToken);
      }

      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          accept: "application/json",
          authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        let errorReason: string | null = null;

        try {
          const payload = (await response.json()) as YoutubeChannelsListResponse;
          errorReason = payload.error?.errors?.[0]?.reason ?? null;
        } catch {
          errorReason = null;
        }

        const status = classifyLookupFailure({
          httpStatus: response.status,
          errorReason,
        });

        console.warn("[google/youtube-channel] Failed to resolve channels from OAuth token.", {
          status: response.status,
          kind: status.kind,
          errorReason,
        });

        return {
          channels: [],
          status,
        };
      }

      const payload = (await response.json()) as YoutubeChannelsListResponse;
      for (const channel of payload.items ?? []) {
        const youtubeChannelId = channel.id;
        if (!youtubeChannelId || seen.has(youtubeChannelId)) {
          continue;
        }

        seen.add(youtubeChannelId);
        channels.push({
          youtubeChannelId,
          youtubeDisplayName: channel.snippet?.title ?? youtubeChannelId,
          youtubeHandle: normalizeYoutubeHandle(channel.snippet?.customUrl),
        });
      }

      nextPageToken = payload.nextPageToken;
    } while (nextPageToken);

    if (channels.length === 0) {
      console.warn("[google/youtube-channel] OAuth lookup returned no YouTube channels.");
      return {
        channels,
        status: {
          kind: "empty",
        },
      };
    }

    return {
      channels,
      status: {
        kind: "channels_found",
        channelCount: channels.length,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown_error";
    console.warn("[google/youtube-channel] Failed to call YouTube Data API.", error);
    return {
      channels: [],
      status: {
        kind: "network_error",
        errorMessage,
      },
    };
  }
}
