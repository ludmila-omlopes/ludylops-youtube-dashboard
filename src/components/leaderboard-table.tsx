import { ViewerBalanceRecord, ViewerRecord } from "@/lib/types";
import { formatDateTime, formatPipetz } from "@/lib/utils";

type LeaderboardEntry =
  | { viewer: ViewerRecord; balance: ViewerBalanceRecord }
  | {
      id: string;
      youtubeChannelId: string | null;
      youtubeDisplayName: string;
      avatarUrl: string | null;
      currentBalance: number;
      lifetimeEarned: number;
      lifetimeSpent: number;
      lastSyncedAt: Date;
    };

function podiumClass(index: number) {
  if (index === 0) return "podium-gold";
  if (index === 1) return "podium-silver";
  if (index === 2) return "podium-bronze";
  return "";
}

export function LeaderboardTable({
  entries,
  compact = false,
}: {
  entries: LeaderboardEntry[];
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border-[3px] border-[var(--color-ink)]">
      <div className="grid grid-cols-[60px_minmax(0,1fr)_110px] gap-3 border-b-[3px] border-[var(--color-ink)] bg-[var(--color-lavender)] px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] sm:grid-cols-[60px_minmax(0,1fr)_110px_150px]">
        <span>#</span>
        <span>Viewer</span>
        <span>Pipetz</span>
        {!compact ? <span className="hidden sm:block">Sync</span> : null}
      </div>
      <div>
        {entries.map((entry, index) => {
          const viewer = "viewer" in entry ? entry.viewer : entry;
          const balance = "balance" in entry ? entry.balance : entry;
          const podium = podiumClass(index);
          return (
            <div
              key={viewer.id ?? `${viewer.youtubeDisplayName}-${index}`}
              className={`grid grid-cols-[60px_minmax(0,1fr)_110px] gap-3 border-b-2 border-[var(--color-ink)]/15 px-4 py-3.5 text-sm sm:grid-cols-[60px_minmax(0,1fr)_110px_150px] ${podium}`}
            >
              <span className="mono font-bold">#{index + 1}</span>
              <div>
                <p className="font-bold">{viewer.youtubeDisplayName}</p>
                <p className="mt-0.5 text-xs uppercase tracking-[0.15em] text-[var(--color-muted)]">
                  {viewer.youtubeChannelId ?? "nao vinculado"}
                </p>
              </div>
              <span className="badge-brutal self-center bg-[var(--color-paper)] px-2 py-1 text-xs">
                {formatPipetz(balance.currentBalance)}
              </span>
              {!compact ? (
                <span className="hidden text-[var(--color-muted)] sm:block">
                  {formatDateTime(balance.lastSyncedAt)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
