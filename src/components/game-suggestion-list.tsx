import type { DemoGameSuggestion } from "@/lib/demo-data";
import { GameSuggestionCard } from "@/components/game-suggestion-card";

export function GameSuggestionList({
  suggestions,
}: {
  suggestions: DemoGameSuggestion[];
}) {
  const sorted = [...suggestions].sort((a, b) => b.totalVotes - a.totalVotes);

  return (
    <div className="grid gap-4">
      {sorted.map((s, i) => (
        <GameSuggestionCard key={s.id} suggestion={s} index={i} />
      ))}
    </div>
  );
}
