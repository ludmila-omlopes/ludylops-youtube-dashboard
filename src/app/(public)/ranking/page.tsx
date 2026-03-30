import { LeaderboardTable } from "@/components/leaderboard-table";
import { getLeaderboard } from "@/lib/db/repository";

export default async function RankingPage() {
  const leaderboard = await getLeaderboard();

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      <section className="panel relative overflow-hidden bg-[var(--color-yellow)] p-6 sm:p-10">
        <div className="bg-dots-light pointer-events-none absolute inset-0 opacity-15" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="mono text-xs font-bold uppercase tracking-[0.32em] text-[var(--color-ink)]">
              🏆 Ranking de pipetz
            </p>
            <h1
              className="mt-3 text-4xl uppercase sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Quem ta mandando na live.
            </h1>
          </div>
          <div className="sticker hidden bg-[var(--color-paper)] px-4 py-2 text-sm sm:inline-flex">
            {leaderboard.length} viewers
          </div>
        </div>
      </section>
      <div className="panel bg-[var(--color-lavender)] p-4 sm:p-6">
        <LeaderboardTable entries={leaderboard} />
      </div>
    </div>
  );
}
