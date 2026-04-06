import { AdminBetsPanel } from "@/components/admin-bets-panel";
import { AdminGameSuggestionsPanel } from "@/components/admin-game-suggestions-panel";
import { RedemptionGrid } from "@/components/redemption-grid";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { LiveStatusPanel } from "@/components/live-status-panel";
import { requireAdminSession } from "@/lib/auth/session";
import {
  getBridgeStatus,
  getCatalog,
  getLeaderboard,
  listAdminGameSuggestions,
  listAdminBets,
  listAdminRedemptions,
} from "@/lib/db/repository";
import { formatDateTime, formatPipetz } from "@/lib/utils";

const statusColorMap: Record<string, string> = {
  queued: "var(--color-lavender)",
  claimed: "var(--color-sky)",
  completed: "var(--color-mint)",
  failed: "var(--color-rose)",
  cancelled: "var(--color-periwinkle)",
};

export default async function AdminPage() {
  await requireAdminSession();
  const [catalog, leaderboard, bridge, redemptions, bets, suggestions] = await Promise.all([
    getCatalog(),
    getLeaderboard(),
    getBridgeStatus(),
    listAdminRedemptions(),
    listAdminBets(),
    listAdminGameSuggestions(),
  ]);

  return (
    <div className="flex w-full flex-col pb-20 pt-8">
      <section className="landing-plane surface-hero py-8 sm:py-10">
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-10">
          <p className="mono text-xs font-bold uppercase tracking-[0.32em] text-[var(--color-ink-soft)]">
            Painel operacional
          </p>
          <h1
            className="mt-3 text-4xl uppercase sm:text-6xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Admin Pipetz
          </h1>
        </div>
      </section>

      <section className="landing-plane landing-divider bg-[var(--color-paper-pink)] py-8 sm:py-10">
        <div className="mx-auto grid w-full max-w-[1500px] gap-6 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-10">
          <LiveStatusPanel bridge={bridge} />
          <div className="panel surface-section p-6">
            <p className="mono text-xs uppercase tracking-[0.3em] text-[var(--color-ink-soft)]">
              Fila recente
            </p>
            <div className="mt-6 grid gap-3">
              {redemptions.slice(0, 6).map((entry) => {
                const statusBg = statusColorMap[entry.status] ?? "var(--color-paper)";
                return (
                  <div key={entry.id} className="card-brutal-static p-4">
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
                    <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
                      {formatDateTime(entry.queuedAt)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-plane landing-divider bg-[var(--color-sky)] py-8 sm:py-10">
        <div className="mx-auto grid w-full max-w-[1500px] gap-6 px-4 sm:px-6 lg:px-10 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="panel surface-section p-6">
            <p className="mono text-xs uppercase tracking-[0.3em] text-[var(--color-ink-soft)]">
              Ranking de pipetz
            </p>
            <div className="mt-6">
              <LeaderboardTable entries={leaderboard.slice(0, 10)} />
            </div>
          </div>
          <RedemptionGrid items={catalog} expanded staticCards />
        </div>
      </section>

      <AdminBetsPanel bets={bets} />
      <AdminGameSuggestionsPanel suggestions={suggestions} />
    </div>
  );
}
