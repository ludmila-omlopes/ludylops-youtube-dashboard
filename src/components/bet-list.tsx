import { BetCard } from "@/components/bet-card";
import type { BetWithOptionsRecord } from "@/lib/types";

export function BetList({
  bets,
  title,
  emptyMessage,
  accentBg,
  viewerBalance,
  loggedIn = false,
  canBet = false,
}: {
  bets: BetWithOptionsRecord[];
  title: string;
  emptyMessage: string;
  accentBg?: string;
  viewerBalance?: number | null;
  loggedIn?: boolean;
  canBet?: boolean;
}) {
  if (bets.length === 0 && emptyMessage) {
    return (
      <div className={`panel p-6 text-center ${accentBg ?? "bg-[var(--color-lilac)]"}`}>
        <p className="text-sm font-bold text-[var(--color-ink-soft)]">
          {emptyMessage}
        </p>
      </div>
    );
  }

  if (bets.length === 0) return null;

  return (
    <section className="panel surface-section p-6 sm:p-8">
      <div className="flex items-center gap-3">
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
      <p className="mono mt-1 text-xs uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">
        {bets.length} {bets.length === 1 ? "aposta" : "apostas"}
      </p>
      <div className="mt-5 grid gap-4">
        {bets.map((bet, i) => (
          <BetCard
            key={bet.id}
            bet={bet}
            index={i}
            viewerBalance={viewerBalance}
            loggedIn={loggedIn}
            canBet={canBet}
          />
        ))}
      </div>
    </section>
  );
}
