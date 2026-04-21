import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { StreamerbotCounterSummaryRecord } from "@/lib/types";
import { formatDateTime, formatPipetz } from "@/lib/utils";

function scopeHeading(scopeKey: string, scopeLabel: string | null) {
  return scopeLabel ?? scopeKey.replace(/[_-]+/g, " ");
}

function actionLabel(action: string | null) {
  switch (action) {
    case "increment":
      return "última ação: incremento";
    case "decrement":
      return "última ação: decremento";
    case "reset":
      return "última ação: reset";
    default:
      return "sem histórico recente";
  }
}

function CounterCard({ counter }: { counter: StreamerbotCounterSummaryRecord }) {
  const scopeText =
    counter.scopeType === "global"
      ? "escopo global"
      : `jogo: ${scopeHeading(counter.scopeKey, counter.scopeLabel)}`;
  const amountNote =
    counter.lastAction === "increment" || counter.lastAction === "decrement"
      ? ` . ajuste ${counter.lastAmount ?? 0}`
      : "";

  return (
    <Card variant="poster" className="h-full bg-[var(--color-paper)] p-5">
      <CardHeader className="gap-0">
        <CardDescription className="mono text-[10px] uppercase tracking-[0.28em]">
          {scopeText}
        </CardDescription>
        <CardTitle
          className="mt-3 text-3xl uppercase leading-none sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {counter.label}
        </CardTitle>
      </CardHeader>

      <CardContent className="mt-6">
        <div className="inline-flex border-[3px] border-[var(--color-ink)] bg-[var(--color-yellow)] px-4 py-2 shadow-[4px_4px_0_#000]">
          <span
            className="text-3xl uppercase leading-none sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatPipetz(counter.value)}
          </span>
        </div>

        <div className="mt-5 space-y-2 text-sm leading-6 text-[var(--color-ink-soft)]">
          <p>{actionLabel(counter.lastAction)}{amountNote}</p>
          <p>
            {counter.lastAction
              ? `atualizado em ${formatDateTime(counter.updatedAt)}`
              : "ainda sem atualização vinda do chat"}
          </p>
          <p>
            {counter.lastResetAt
              ? `ultimo reset em ${formatDateTime(counter.lastResetAt)}`
              : "ainda não foi resetado"}
          </p>
          <p>chave tecnica: {counter.key}</p>
          <p>origem: {counter.source ?? "manual / não informado"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CounterBoard({ counters }: { counters: StreamerbotCounterSummaryRecord[] }) {
  const globalCounters = counters.filter((counter) => counter.scopeType === "global");
  const gameGroups = counters
    .filter((counter) => counter.scopeType === "game")
    .reduce<Map<string, StreamerbotCounterSummaryRecord[]>>((groups, counter) => {
      const existing = groups.get(counter.scopeKey) ?? [];
      existing.push(counter);
      groups.set(counter.scopeKey, existing);
      return groups;
    }, new Map());

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xl">Global</span>
          <h2
            className="text-2xl font-bold uppercase"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Contadores da live inteira
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {globalCounters.map((counter) => (
            <CounterCard key={`${counter.scopeType}:${counter.scopeKey}:${counter.key}`} counter={counter} />
          ))}
        </div>
      </section>

      {gameGroups.size > 0 ? (
        <section className="space-y-8">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xl">Jogos</span>
            <h2
              className="text-2xl font-bold uppercase"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Contadores por jogo
            </h2>
          </div>

          {Array.from(gameGroups.entries()).map(([scopeKey, entries]) => (
            <div key={scopeKey} className="landing-plane bg-[var(--color-paper-pink)] p-5 sm:p-6">
              <div className="mb-5">
                <p className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
                  jogo monitorado
                </p>
                <h3
                  className="mt-2 text-3xl uppercase leading-none"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {scopeHeading(scopeKey, entries[0]?.scopeLabel ?? null)}
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {entries.map((counter) => (
                  <CounterCard key={`${counter.scopeType}:${counter.scopeKey}:${counter.key}`} counter={counter} />
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
