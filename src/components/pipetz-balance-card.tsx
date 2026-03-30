import { formatPipetz } from "@/lib/utils";

export function PipetzBalanceCard({
  displayName,
  currentBalance,
  lifetimeEarned,
  lifetimeSpent,
  compact = false,
}: {
  displayName: string;
  currentBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  compact?: boolean;
}) {
  return (
    <div className="panel relative overflow-hidden bg-[var(--color-lavender)] p-6 sm:p-8">
      {/* Dot pattern decorativo */}
      <div className="bg-dots-light pointer-events-none absolute inset-0 opacity-20" />

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mono text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">
            Meus Pipetz
          </p>
          <h1
            className={`mt-2 uppercase text-[var(--color-ink)] ${compact ? "text-2xl" : "text-4xl sm:text-5xl"}`}
            style={{ fontFamily: "var(--font-display)" }}
          >
            {displayName}
          </h1>
        </div>

        <div className="text-right">
          {/* Numero grande com sombra colorida */}
          <div
            className={`inline-block rounded-[var(--radius)] border-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] px-5 py-3 ${compact ? "" : "shadow-purple"}`}
          >
            <p
              className={`text-[var(--color-purple-bold)] ${compact ? "text-3xl" : "text-4xl sm:text-6xl"}`}
              style={{ fontFamily: "var(--font-display)" }}
            >
              {formatPipetz(currentBalance)}
            </p>
          </div>
          <p className="mono mt-2 text-xs uppercase tracking-[0.15em] text-[var(--color-muted)]">
            pipetz
          </p>
        </div>
      </div>

      {!compact ? (
        <div className="relative mt-5 flex flex-wrap gap-3">
          <span className="rounded-[var(--radius)] border-2 border-[var(--color-ink)] bg-[var(--color-mint)] px-3 py-1.5 text-sm font-bold">
            ↗ Ganhos: {formatPipetz(lifetimeEarned)}
          </span>
          <span className="rounded-[var(--radius)] border-2 border-[var(--color-ink)] bg-[var(--color-rose)] px-3 py-1.5 text-sm font-bold">
            ↘ Gastos: {formatPipetz(lifetimeSpent)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
