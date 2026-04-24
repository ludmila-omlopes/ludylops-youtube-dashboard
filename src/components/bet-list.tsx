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
  fullWidth = false,
  sectionClassName,
}: {
  bets: BetWithOptionsRecord[];
  title: string;
  emptyMessage: string;
  accentBg?: string;
  viewerBalance?: number | null;
  loggedIn?: boolean;
  canBet?: boolean;
  fullWidth?: boolean;
  sectionClassName?: string;
}) {
  if (bets.length === 0 && emptyMessage) {
    if (fullWidth) {
      return (
        <section
          className={`landing-plane landing-divider py-8 sm:py-10 ${sectionClassName ?? accentBg ?? "bg-[var(--color-lilac)]"}`}
        >
          <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-10">
            <p className="text-sm font-bold text-[var(--color-ink-soft)]">{emptyMessage}</p>
          </div>
        </section>
      );
    }

    return (
      <div className={`panel p-6 text-center ${accentBg ?? "bg-[var(--color-lilac)]"}`}>
        <p className="text-sm font-bold text-[var(--color-ink-soft)]">{emptyMessage}</p>
      </div>
    );
  }

  if (bets.length === 0) return null;

  const header = (
    <>
      <h2 className="text-2xl font-bold uppercase" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h2>
      <div className="mt-5 grid gap-4">
        {bets.map((bet) => (
          <BetCard
            key={bet.id}
            bet={bet}
            viewerBalance={viewerBalance}
            loggedIn={loggedIn}
            canBet={canBet}
          />
        ))}
      </div>
    </>
  );

  if (fullWidth) {
    return (
      <section className={`landing-plane landing-divider py-8 sm:py-10 ${sectionClassName ?? "surface-section"}`}>
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-10">{header}</div>
      </section>
    );
  }

  return <section className="panel surface-section p-6 sm:p-8">{header}</section>;
}
