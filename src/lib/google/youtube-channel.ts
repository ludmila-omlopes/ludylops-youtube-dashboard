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
};

export type YoutubeChannelIdentity = {
  youtubeChannelId: string;
  youtubeDisplayName: string;
  youtubeHandle: string | null;
};

export async function getYoutubeChannelFromGoogleAccessToken(
  accessToken: string,
): Promise<YoutubeChannelIdentity[]> {
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
        console.warn("[google/youtube-channel] Failed to resolve channels from OAuth token.", {
          status: response.status,
        });
        return channels;
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

    return channels;
  } catch (error) {
    console.warn("[google/youtube-channel] Failed to call YouTube Data API.", error);
    return channels;
  }
}
