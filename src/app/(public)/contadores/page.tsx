import { CounterBoard } from "@/components/counter-board";
import { listStreamerbotCounters } from "@/lib/db/repository";

export default async function ContadoresPage() {
  const counters = await listStreamerbotCounters();
  const gameScopeCount = new Set(
    counters.filter((counter) => counter.scopeType === "game").map((counter) => counter.scopeKey),
  ).size;

  return (
    <div className="flex w-full flex-col pb-20 pt-8">
      <section className="landing-plane surface-hero relative overflow-hidden py-8 sm:py-10">
        <div className="bg-dots-light pointer-events-none absolute inset-0 opacity-15" />
        <div className="relative mx-auto flex w-full max-w-[1500px] items-start justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <div>
            <p className="mono text-xs font-bold uppercase tracking-[0.32em] text-[var(--color-ink-soft)]">
              stream state
            </p>
            <h1
              className="mt-3 text-4xl uppercase sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Contadores da live.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-ink-soft)] sm:text-base">
              Aqui ficam os totais globais e os contadores por jogo que o chat e o Streamer.bot estao mexendo ao vivo.
            </p>
          </div>
          <div className="sticker hidden accent-chip-strong px-4 py-2 text-sm sm:inline-flex">
            {counters.length} contadores
          </div>
        </div>
      </section>

      <section className="landing-plane landing-divider bg-[var(--color-sky)] py-8 sm:py-10">
        <div className="mx-auto grid w-full max-w-[1500px] gap-4 px-4 sm:px-6 lg:grid-cols-3 lg:px-10">
          <div className="card-poster bg-[var(--color-yellow)] p-5">
            <p className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
              total monitorado
            </p>
            <p
              className="mt-3 text-4xl uppercase leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {counters.length}
            </p>
          </div>
          <div className="card-poster bg-[var(--color-blue)] p-5">
            <p className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
              escopos globais
            </p>
            <p
              className="mt-3 text-4xl uppercase leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {counters.filter((counter) => counter.scopeType === "global").length}
            </p>
          </div>
          <div className="card-poster bg-[var(--color-pink)] p-5">
            <p className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
              jogos com contador
            </p>
            <p
              className="mt-3 text-4xl uppercase leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {gameScopeCount}
            </p>
          </div>
        </div>
      </section>

      <section className="landing-plane landing-divider bg-[var(--color-paper-pink)] py-8 sm:py-10">
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-10">
          <CounterBoard counters={counters} />
        </div>
      </section>
    </div>
  );
}
