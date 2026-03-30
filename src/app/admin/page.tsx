import { RedemptionGrid } from "@/components/redemption-grid";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { LiveStatusPanel } from "@/components/live-status-panel";
import { requireAdminSession } from "@/lib/auth/session";
import {
  getBridgeStatus,
  getCatalog,
  getLeaderboard,
  listAdminRedemptions,
} from "@/lib/db/repository";
import { formatDateTime, formatPipetz } from "@/lib/utils";

const statusColorMap: Record<string, string> = {
  queued: "var(--color-lavender)",
  claimed: "var(--color-sky)",
  completed: "var(--color-mint)",
  failed: "var(--color-pink)",
  cancelled: "var(--color-periwinkle)",
};

export default async function AdminPage() {
  await requireAdminSession();
  const [catalog, leaderboard, bridge, redemptions] = await Promise.all([
    getCatalog(),
    getLeaderboard(),
    getBridgeStatus(),
    listAdminRedemptions(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      <section className="panel bg-[var(--color-lavender)] p-6 sm:p-8">
        <p className="mono text-xs font-bold uppercase tracking-[0.32em] text-[var(--color-ink)]/50">
          Painel operacional
        </p>
        <h1
          className="mt-3 text-4xl uppercase sm:text-6xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Admin Pipetz
        </h1>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <LiveStatusPanel bridge={bridge} />
        <div className="panel bg-[var(--color-rose)] p-6">
          <p className="mono text-xs uppercase tracking-[0.3em] text-[var(--color-ink)]/50">
            Fila recente
          </p>
          <div className="mt-6 grid gap-3">
            {redemptions.slice(0, 6).map((entry) => {
              const statusBg = statusColorMap[entry.status] ?? "var(--color-paper)";
              return (
                <div key={entry.id} className="card-brutal p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className="badge-brutal px-2 py-1 text-[10px] text-[var(--color-ink)]"
                      style={{ backgroundColor: statusBg }}
                    >
                      {entry.status}
                    </span>
                    <span className="mono text-xs font-bold uppercase tracking-[0.18em]">
                      {formatPipetz(entry.costAtPurchase)} pipetz
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-ink)]/60">
                    {formatDateTime(entry.queuedAt)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="panel bg-[var(--color-lilac)] p-6">
          <p className="mono text-xs uppercase tracking-[0.3em] text-[var(--color-ink)]/50">
            Ranking de pipetz
          </p>
          <div className="mt-6">
            <LeaderboardTable entries={leaderboard.slice(0, 10)} />
          </div>
        </div>
        <RedemptionGrid items={catalog} expanded />
      </section>
    </div>
  );
}
