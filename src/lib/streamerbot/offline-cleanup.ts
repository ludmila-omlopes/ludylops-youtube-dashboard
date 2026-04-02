export type BroadcastRecord = {
  videoId: string;
  channelId: string;
  title: string;
  searchEventType: "completed" | "live";
  actualStartTime: string | null;
  actualEndTime: string | null;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
};

export type TimeInterval = {
  startAt: string;
  endAt: string;
  channelId: string;
  videoId: string;
  title: string;
};

export type BroadcastIntervals = {
  liveIntervals: TimeInterval[];
  reviewIntervals: TimeInterval[];
  unresolvedBroadcasts: BroadcastRecord[];
};

export type EventClassification = "live" | "offline" | "review";

export type ViewerBalanceRollback = {
  viewerId: string;
  currentBalanceDelta: number;
  lifetimeEarnedDelta: number;
  lifetimeSpentDelta: number;
};

function parseTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function buildInterval(record: BroadcastRecord, startAt: number, endAt: number): TimeInterval | null {
  if (endAt < startAt) {
    return null;
  }

  return {
    startAt: new Date(startAt).toISOString(),
    endAt: new Date(endAt).toISOString(),
    channelId: record.channelId,
    videoId: record.videoId,
    title: record.title,
  };
}

export function mergeIntervals(intervals: TimeInterval[]) {
  if (intervals.length === 0) {
    return [];
  }

  const sorted = [...intervals].sort((left, right) => {
    const leftStart = parseTimestamp(left.startAt) ?? 0;
    const rightStart = parseTimestamp(right.startAt) ?? 0;
    return leftStart - rightStart;
  });

  const merged: TimeInterval[] = [sorted[0]!];

  for (const interval of sorted.slice(1)) {
    const current = merged[merged.length - 1]!;
    const currentEnd = parseTimestamp(current.endAt) ?? 0;
    const nextStart = parseTimestamp(interval.startAt) ?? 0;
    const nextEnd = parseTimestamp(interval.endAt) ?? 0;

    if (nextStart <= currentEnd) {
      if (nextEnd > currentEnd) {
        current.endAt = interval.endAt;
      }
      continue;
    }

    merged.push({ ...interval });
  }

  return merged;
}

export function buildBroadcastIntervals(records: BroadcastRecord[], nowIso: string): BroadcastIntervals {
  const liveIntervals: TimeInterval[] = [];
  const reviewIntervals: TimeInterval[] = [];
  const unresolvedBroadcasts: BroadcastRecord[] = [];
  const fallbackEnd = parseTimestamp(nowIso) ?? Date.now();

  for (const record of records) {
    const actualStart = parseTimestamp(record.actualStartTime);
    const actualEnd = parseTimestamp(record.actualEndTime);
    const scheduledStart = parseTimestamp(record.scheduledStartTime);
    const scheduledEnd = parseTimestamp(record.scheduledEndTime);

    if (actualStart !== null && actualEnd !== null) {
      const interval = buildInterval(record, actualStart, actualEnd);
      if (interval) {
        liveIntervals.push(interval);
        continue;
      }
    }

    if (actualStart !== null && actualEnd === null && record.searchEventType === "live") {
      const interval = buildInterval(record, actualStart, fallbackEnd);
      if (interval) {
        liveIntervals.push(interval);
        continue;
      }
    }

    const reviewStart = actualStart ?? scheduledStart;
    const reviewEnd =
      actualEnd ??
      scheduledEnd ??
      (record.searchEventType === "live" && actualStart !== null ? fallbackEnd : null);

    if (reviewStart !== null && reviewEnd !== null) {
      const interval = buildInterval(record, reviewStart, reviewEnd);
      if (interval) {
        reviewIntervals.push(interval);
        continue;
      }
    }

    unresolvedBroadcasts.push(record);
  }

  return {
    liveIntervals: mergeIntervals(liveIntervals),
    reviewIntervals: mergeIntervals(reviewIntervals),
    unresolvedBroadcasts,
  };
}

export function classifyOccurredAt(
  occurredAt: string,
  liveIntervals: TimeInterval[],
  reviewIntervals: TimeInterval[],
): EventClassification {
  const occurredAtTimestamp = parseTimestamp(occurredAt);
  if (occurredAtTimestamp === null) {
    return "review";
  }

  const inInterval = (interval: TimeInterval) => {
    const startAt = parseTimestamp(interval.startAt);
    const endAt = parseTimestamp(interval.endAt);
    if (startAt === null || endAt === null) {
      return false;
    }

    return occurredAtTimestamp >= startAt && occurredAtTimestamp <= endAt;
  };

  if (liveIntervals.some(inInterval)) {
    return "live";
  }

  if (reviewIntervals.some(inInterval)) {
    return "review";
  }

  return "offline";
}

export function buildViewerBalanceRollback(
  candidates: Array<{ viewerId: string; amount: number }>,
): ViewerBalanceRollback[] {
  const rollbackByViewer = new Map<string, ViewerBalanceRollback>();

  for (const candidate of candidates) {
    const existing = rollbackByViewer.get(candidate.viewerId) ?? {
      viewerId: candidate.viewerId,
      currentBalanceDelta: 0,
      lifetimeEarnedDelta: 0,
      lifetimeSpentDelta: 0,
    };

    existing.currentBalanceDelta -= candidate.amount;
    if (candidate.amount > 0) {
      existing.lifetimeEarnedDelta -= candidate.amount;
    } else if (candidate.amount < 0) {
      existing.lifetimeSpentDelta -= Math.abs(candidate.amount);
    }

    rollbackByViewer.set(candidate.viewerId, existing);
  }

  return Array.from(rollbackByViewer.values()).sort((left, right) => left.viewerId.localeCompare(right.viewerId));
}
