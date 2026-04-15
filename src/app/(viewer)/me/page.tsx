import { redirect } from "next/navigation";

import { PipetzBalanceCard } from "@/components/pipetz-balance-card";
import { RedemptionGrid } from "@/components/redemption-grid";
import { ViewerLinkCard } from "@/components/viewer-link-card";
import { getCatalog, getViewerDashboard } from "@/lib/db/repository";
import { requireSession } from "@/lib/auth/session";
import { formatDateTime, formatPipetz } from "@/lib/utils";

const statusColorMap: Record<string, string> = {
  queued: "var(--color-lavender)",
  claimed: "var(--color-sky)",
  completed: "var(--color-mint)",
  failed: "var(--color-rose)",
  cancelled: "var(--color-periwinkle)",
};

export default async function MePage() {
  const session = await requireSession();
  const [dashboard, catalog] = await Promise.all([
    getViewerDashboard(session.user!.activeViewerId!),
    getCatalog(),
  ]);

  if (!dashboard) {
    redirect("/");
  }

  return (
    <div className="flex w-full flex-col pb-20 pt-8">
      {/* Balance hero */}
      <PipetzBalanceCard
        displayName={dashboard.viewer.youtubeDisplayName}
        currentBalance={dashboard.balance.currentBalance}
        lifetimeEarned={dashboard.balance.lifetimeEarned}
        lifetimeSpent={dashboard.balance.lifetimeSpent}
      />

      <ViewerLinkCard isLinked={dashboard.viewer.isLinked} />

      {/* Stats + Redemption timeline */}
      <section className="landing-plane landing-divider bg-[var(--color-sky)] py-8 sm:py-10">
        <div className="mx-auto grid w-full max-w-[1500px] gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
          <div className="grid gap-4 self-start sm:grid-cols-2">
            <div className="card-brutal surface-card p-5">
              <p className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
                Pipetz ganhos
              </p>
              <p className="mt-2 text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {formatPipetz(dashboard.balance.lifetimeEarned)}
              </p>
            </div>
            <div className="card-brutal surface-card-alt p-5">
              <p className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
                Pipetz gastos
              </p>
              <p className="mt-2 text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {formatPipetz(dashboard.balance.lifetimeSpent)}
              </p>
            </div>
          </div>

          <div className="landing-plane surface-section p-6 sm:p-8">
            <p className="mono text-xs uppercase tracking-[0.3em] text-[var(--color-ink-soft)]">
              Seus resgates
            </p>
            <div className="mt-5 grid gap-3">
              {dashboard.redemptions.length ? (
                dashboard.redemptions.map((entry) => {
                  const item = catalog.find((catalogItem) => catalogItem.id === entry.catalogItemId);
                  const statusBg = statusColorMap[entry.status] ?? "var(--color-paper)";
                  return (
                    <div key={entry.id} className="card-brutal p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
                          {item?.name ?? "Item removido"}
                        </h2>
                        <span
                          className="badge-brutal px-2 py-1 text-[10px] text-[var(--color-ink)]"
                          style={{ backgroundColor: statusBg }}
                        >
                          {entry.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
                        {formatPipetz(entry.costAtPurchase)} pipetz &bull; {formatDateTime(entry.queuedAt)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="card-brutal surface-card p-5 text-center">
                  <p className="text-sm font-bold text-[var(--color-ink-soft)]">
                    Nenhum resgate ainda. Gaste seus pipetz nos resgates!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <RedemptionGrid
        items={catalog}
        viewerBalance={dashboard.balance.currentBalance}
        expanded
        fullWidth
        sectionClassName="bg-[var(--color-paper-pink)]"
      />
    </div>
  );
}
