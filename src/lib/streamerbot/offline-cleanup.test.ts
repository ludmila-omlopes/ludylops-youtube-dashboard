import { describe, expect, it } from "vitest";

import {
  buildBroadcastIntervals,
  buildViewerBalanceRollback,
  classifyOccurredAt,
  mergeIntervals,
} from "@/lib/streamerbot/offline-cleanup";

describe("mergeIntervals", () => {
  it("merges overlapping windows", () => {
    const result = mergeIntervals([
      {
        startAt: "2026-04-01T10:00:00.000Z",
        endAt: "2026-04-01T10:30:00.000Z",
        channelId: "channel-1",
        videoId: "video-1",
        title: "Live 1",
      },
      {
        startAt: "2026-04-01T10:20:00.000Z",
        endAt: "2026-04-01T11:00:00.000Z",
        channelId: "channel-1",
        videoId: "video-2",
        title: "Live 2",
      },
    ]);

    expect(result).toEqual([
      {
        startAt: "2026-04-01T10:00:00.000Z",
        endAt: "2026-04-01T11:00:00.000Z",
        channelId: "channel-1",
        videoId: "video-1",
        title: "Live 1",
      },
    ]);
  });
});

describe("buildBroadcastIntervals", () => {
  it("separates confirmed live intervals from review windows", () => {
    const result = buildBroadcastIntervals(
      [
        {
          videoId: "video-confirmed",
          channelId: "channel-1",
          title: "Confirmed live",
          searchEventType: "completed",
          actualStartTime: "2026-04-01T10:00:00.000Z",
          actualEndTime: "2026-04-01T11:00:00.000Z",
          scheduledStartTime: null,
          scheduledEndTime: null,
        },
        {
          videoId: "video-review",
          channelId: "channel-1",
          title: "Needs review",
          searchEventType: "completed",
          actualStartTime: null,
          actualEndTime: null,
          scheduledStartTime: "2026-04-01T12:00:00.000Z",
          scheduledEndTime: "2026-04-01T13:00:00.000Z",
        },
      ],
      "2026-04-01T15:00:00.000Z",
    );

    expect(result.liveIntervals).toEqual([
      {
        startAt: "2026-04-01T10:00:00.000Z",
        endAt: "2026-04-01T11:00:00.000Z",
        channelId: "channel-1",
        videoId: "video-confirmed",
        title: "Confirmed live",
      },
    ]);
    expect(result.reviewIntervals).toEqual([
      {
        startAt: "2026-04-01T12:00:00.000Z",
        endAt: "2026-04-01T13:00:00.000Z",
        channelId: "channel-1",
        videoId: "video-review",
        title: "Needs review",
      },
    ]);
    expect(result.unresolvedBroadcasts).toEqual([]);
  });

  it("treats ongoing live broadcasts as open intervals up to now", () => {
    const result = buildBroadcastIntervals(
      [
        {
          videoId: "video-live",
          channelId: "channel-1",
          title: "Currently live",
          searchEventType: "live",
          actualStartTime: "2026-04-01T14:00:00.000Z",
          actualEndTime: null,
          scheduledStartTime: null,
          scheduledEndTime: null,
        },
      ],
      "2026-04-01T15:00:00.000Z",
    );

    expect(result.liveIntervals).toEqual([
      {
        startAt: "2026-04-01T14:00:00.000Z",
        endAt: "2026-04-01T15:00:00.000Z",
        channelId: "channel-1",
        videoId: "video-live",
        title: "Currently live",
      },
    ]);
  });
});

describe("classifyOccurredAt", () => {
  const liveIntervals = [
    {
      startAt: "2026-04-01T10:00:00.000Z",
      endAt: "2026-04-01T11:00:00.000Z",
      channelId: "channel-1",
      videoId: "video-1",
      title: "Live 1",
    },
  ];
  const reviewIntervals = [
    {
      startAt: "2026-04-01T12:00:00.000Z",
      endAt: "2026-04-01T13:00:00.000Z",
      channelId: "channel-1",
      videoId: "video-2",
      title: "Review 1",
    },
  ];

  it("returns live when timestamp falls in a confirmed live window", () => {
    expect(classifyOccurredAt("2026-04-01T10:15:00.000Z", liveIntervals, reviewIntervals)).toBe("live");
  });

  it("returns review when timestamp falls in an uncertain window", () => {
    expect(classifyOccurredAt("2026-04-01T12:15:00.000Z", liveIntervals, reviewIntervals)).toBe("review");
  });

  it("returns offline when timestamp is outside all windows", () => {
    expect(classifyOccurredAt("2026-04-01T09:15:00.000Z", liveIntervals, reviewIntervals)).toBe("offline");
  });
});

describe("buildViewerBalanceRollback", () => {
  it("aggregates rollback deltas per viewer", () => {
    expect(
      buildViewerBalanceRollback([
        { viewerId: "viewer-1", amount: 5 },
        { viewerId: "viewer-1", amount: 7 },
        { viewerId: "viewer-2", amount: -3 },
      ]),
    ).toEqual([
      {
        viewerId: "viewer-1",
        currentBalanceDelta: -12,
        lifetimeEarnedDelta: -12,
        lifetimeSpentDelta: 0,
      },
      {
        viewerId: "viewer-2",
        currentBalanceDelta: 3,
        lifetimeEarnedDelta: 0,
        lifetimeSpentDelta: -3,
      },
    ]);
  });
});
