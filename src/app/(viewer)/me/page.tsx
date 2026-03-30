import { redirect } from "next/navigation";

import { PipetzBalanceCard } from "@/components/pipetz-balance-card";
import { RedemptionGrid } from "@/components/redemption-grid";
import { getCatalog, getViewerDashboard } from "@/lib/db/repository";
import { requireSession } from "@/lib/auth/session";
import { formatDateTime, formatPipetz } from "@/lib/utils";

const statusColorMap: Record<string, string> = {
  queued: "var(--color-lavender)",
  claimed: "var(--color-sky)",
  completed: "var(--color-mint)",
  failed: "var(--color-pink)",
  cancelled: "var(--color-periwinkle)",
};

export default async function MePage() {
  const session = await requireSession();
  const [dashboard, catalog] = await Promise.all([
    getViewerDashboard(session.user!.email!),
    getCatalog(),
  ]);

  if (!dashboard) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      {/* Balance hero */}
      <PipetzBalanceCard
        displayName={dashboard.viewer.youtubeDisplayName}
        currentBalance={dashboard.balance.currentBalance}
        lifetimeEarned={dashboard.balance.lifetimeEarned}
        lifetimeSpent={dashboard.balance.lifetimeSpent}
      />

      {/* Stats + Redemption timeline */}
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4 self-start sm:grid-cols-2">
          <div className="card-brutal bg-[var(--color-sky)] p-5">
            <p className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink)]/50">
              Pipetz ganhos
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              {formatPipetz(dashboard.balance.lifetimeEarned)}
            </p>
          </div>
          <div className="card-brutal bg-[var(--color-periwinkle)] p-5">
            <p className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink)]/50">
              Pipetz gastos
            </p>
            <p className="mt-2 text-3xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              {formatPipetz(dashboard.balance.lifetimeSpent)}
            </p>
          </div>
        </div>

        <div className="panel bg-[var(--color-lilac)] p-6 sm:p-8">
          <p className="mono text-xs uppercase tracking-[0.3em] text-[var(--color-ink)]/50">
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
                    <p className="mt-2 text-sm text-[var(--color-ink)]/60">
                      {formatPipetz(entry.costAtPurchase)} pipetz &bull; {formatDateTime(entry.queuedAt)}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="card-brutal bg-[var(--color-lavender)] p-5 text-center">
                <p className="text-sm font-bold text-[var(--color-ink)]/60">
                  Nenhum resgate ainda. Gaste seus pipetz nos resgates!
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <RedemptionGrid items={catalog} viewerBalance={dashboard.balance.currentBalance} expanded />
    </div>
  );
}
