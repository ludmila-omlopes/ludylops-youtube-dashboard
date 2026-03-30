import type { DemoBet } from "@/lib/demo-data";
import { BetCard } from "@/components/bet-card";

export function BetList({
  bets,
  title,
  emptyMessage,
  accentBg = "bg-[var(--color-sky)]",
}: {
  bets: DemoBet[];
  title: string;
  emptyMessage: string;
  accentBg?: string;
}) {
  if (bets.length === 0 && emptyMessage) {
    return (
      <div className="panel bg-[var(--color-lilac)] p-6 text-center">
        <p className="text-sm font-bold text-[var(--color-muted)]">
          {emptyMessage}
        </p>
      </div>
    );
  }

  if (bets.length === 0) return null;

  return (
    <section className={`panel ${accentBg} p-6 sm:p-8`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">
          {title.toLowerCase().includes("encerrada") ? "📋" : "🎲"}
        </span>
        <h2
          className="text-2xl font-bold uppercase"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h2>
      </div>
      <p className="mono mt-1 text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
        {bets.length} {bets.length === 1 ? "aposta" : "apostas"}
      </p>
      <div className="mt-5 grid gap-4">
        {bets.map((bet, i) => (
          <BetCard key={bet.id} bet={bet} index={i} />
        ))}
      </div>
    </section>
  );
}
