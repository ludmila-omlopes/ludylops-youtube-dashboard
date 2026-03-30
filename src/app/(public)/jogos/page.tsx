import { GameSuggestForm } from "@/components/game-suggest-form";
import { GameSuggestionList } from "@/components/game-suggestion-list";
import { demoGameSuggestions } from "@/lib/demo-data";

export default function JogosPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10">
      <section className="panel relative overflow-hidden bg-[var(--color-sky)] p-6 sm:p-10">
        <div className="bg-dots-light pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="mono text-xs font-bold uppercase tracking-[0.32em] text-[var(--color-muted)]">
              🎮 Sugestoes de jogos
            </p>
            <h1
              className="mt-3 text-4xl uppercase sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Me diz o que jogar.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-muted)] sm:text-base">
              Sugira jogos e gaste pipetz pra dar boost. Quanto mais pipetz, mais chance de eu jogar!
            </p>
          </div>
          <div className="sticker hidden bg-[var(--color-yellow)] px-4 py-2 text-sm sm:inline-flex">
            ⚡ Boost
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xl">🗳️</span>
            <h2
              className="text-2xl font-bold uppercase"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sugestoes da galera
            </h2>
          </div>
          <GameSuggestionList suggestions={demoGameSuggestions} />
        </div>
        <div className="self-start lg:sticky lg:top-24">
          <GameSuggestForm />
        </div>
      </div>
    </div>
  );
}
