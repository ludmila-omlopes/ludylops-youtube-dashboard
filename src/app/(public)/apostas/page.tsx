import { BetList } from "@/components/bet-list";
import { demoBets } from "@/lib/demo-data";

export default function ApostasPage() {
  const activeBets = demoBets.filter((b) => b.status === "open" || b.status === "locked");
  const resolvedBets = demoBets.filter((b) => b.status === "resolved" || b.status === "cancelled");

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      <section className="panel relative overflow-hidden bg-[var(--color-rose)] p-6 sm:p-10">
        <div className="bg-dots-light pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="mono text-xs font-bold uppercase tracking-[0.32em] text-[var(--color-muted)]">
              🎲 Apostas
            </p>
            <h1
              className="mt-3 text-4xl uppercase sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Aposte pipetz nos desafios da live.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-muted)] sm:text-base">
              Escolha um lado, coloque seus pipetz e torça. Se acertar, leva uma parte do pool!
            </p>
          </div>
          <div className="sticker sticker-tilt-right hidden bg-[var(--color-pink-hot)] px-4 py-2 text-sm text-white sm:inline-flex">
            🔥 Ao vivo
          </div>
        </div>
      </section>

      <BetList
        bets={activeBets}
        title="Apostas abertas"
        emptyMessage="Nenhuma aposta rolando agora. Aguarde a proxima live!"
        accentBg="bg-[var(--color-sky)]"
      />

      {resolvedBets.length > 0 ? (
        <BetList
          bets={resolvedBets}
          title="Apostas encerradas"
          emptyMessage=""
          accentBg="bg-[var(--color-lavender)]"
        />
      ) : null}
    </div>
  );
}
