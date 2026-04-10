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

export type YoutubeChannelLookupStatus =
  | {
      kind: "channels_found";
      channelCount: number;
    }
  | {
      kind: "empty";
    }
  | {
      kind: "scope_missing";
      grantedScopes: string[];
    }
  | {
      kind: "authorization_required";
      httpStatus: number;
      errorReason: string | null;
    }
  | {
      kind: "insufficient_permissions";
      httpStatus: number;
      errorReason: string | null;
    }
  | {
      kind: "http_error";
      httpStatus: number;
      errorReason: string | null;
    }
  | {
      kind: "network_error";
      errorMessage: string;
    };

export type YoutubeChannelLookupResult = {
  channels: YoutubeChannelIdentity[];
  status: YoutubeChannelLookupStatus;
};

type YoutubeChannelsFoundLookup = YoutubeChannelLookupResult & {
  channels: [YoutubeChannelIdentity, ...YoutubeChannelIdentity[]];
  status: Extract<YoutubeChannelLookupStatus, { kind: "channels_found" }>;
};

const YOUTUBE_READONLY_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

function normalizeYoutubeHandle(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function parseScopes(scope: string | null | undefined) {
  return (scope ?? "")
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function classifyLookupFailure(input: {
  httpStatus: number;
  errorReason: string | null;
}): YoutubeChannelLookupStatus {
  if (input.httpStatus === 401 || input.errorReason === "authorizationRequired") {
    return {
      kind: "authorization_required",
      httpStatus: input.httpStatus,
      errorReason: input.errorReason,
    };
  }

  if (
    input.httpStatus === 403 &&
    (input.errorReason === "insufficientPermissions" || input.errorReason === "forbidden")
  ) {
    return {
      kind: "insufficient_permissions",
      httpStatus: input.httpStatus,
      errorReason: input.errorReason,
    };
  }

  return {
    kind: "http_error",
    httpStatus: input.httpStatus,
    errorReason: input.errorReason,
  };
}

export function getYoutubeChannelLookupMessage(status: YoutubeChannelLookupStatus) {
  switch (status.kind) {
    case "channels_found":
      return null;
    case "empty":
      return "Sua conta Google entrou, mas o YouTube nao retornou nenhum canal para vincular.";
    case "scope_missing":
      return "O login Google nao concedeu a permissao youtube.readonly necessaria para descobrir seu canal.";
    case "authorization_required":
      return `O YouTube recusou a consulta do canal nesta tentativa (${status.httpStatus}).`;
    case "insufficient_permissions":
      return "O token Google nao teve permissao suficiente para consultar seu canal do YouTube.";
    case "http_error":
      return `O YouTube respondeu com erro ${status.httpStatus} ao consultar seu canal.`;
    case "network_error":
      return "Nao foi possivel falar com a API do YouTube para descobrir seu canal nesta tentativa.";
  }
}

export function canBootstrapViewerFromYoutubeLookup(
  result: YoutubeChannelLookupResult | null,
): result is YoutubeChannelsFoundLookup {
  return result?.status.kind === "channels_found" && result.channels.length > 0;
}

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
