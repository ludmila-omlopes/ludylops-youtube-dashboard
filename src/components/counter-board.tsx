import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StreamerbotCounterSummaryRecord } from "@/lib/types";
import { formatPipetz } from "@/lib/utils";

function scopeHeading(scopeKey: string, scopeLabel: string | null) {
  return scopeLabel ?? scopeKey.replace(/[_-]+/g, " ");
}

function CounterCard({ counter }: { counter: StreamerbotCounterSummaryRecord }) {
  return (
    <Card variant="poster" className="h-full bg-[var(--color-paper)] p-5">
      <CardHeader className="gap-0">
        <CardTitle
          className="text-3xl uppercase leading-none sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {counter.label}
        </CardTitle>
      </CardHeader>

      <CardContent className="mt-6">
        <div className="micro-flat inline-flex border-[3px] border-[var(--color-ink)] bg-[var(--color-purple)] px-4 py-2 shadow-[4px_4px_0_var(--shadow-color)]">
          <span
            className="text-3xl uppercase leading-none text-[var(--color-accent-ink)] sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatPipetz(counter.value)}
          </span>
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {globalCounters.map((counter) => (
            <CounterCard key={`${counter.scopeType}:${counter.scopeKey}:${counter.key}`} counter={counter} />
          ))}
        </div>
      </section>

      {gameGroups.size > 0 ? (
        <section className="space-y-8">
          <div className="grid gap-8 xl:grid-cols-2">
            {Array.from(gameGroups.entries()).map(([scopeKey, entries]) => (
              <div key={scopeKey} className="landing-plane h-full bg-[var(--color-paper-pink)] p-5 sm:p-6">
                <h3
                  className="mb-5 text-3xl uppercase leading-none"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {scopeHeading(scopeKey, entries[0]?.scopeLabel ?? null)}
                </h3>

                <div className="grid gap-4">
                  {entries.map((counter) => (
                    <CounterCard key={`${counter.scopeType}:${counter.scopeKey}:${counter.key}`} counter={counter} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
