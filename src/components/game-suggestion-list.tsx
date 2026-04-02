import { GameSuggestionCard } from "@/components/game-suggestion-card";
import type { GameSuggestionWithMeta } from "@/lib/types";

export function GameSuggestionList({
  suggestions,
  loggedIn = false,
  canInteract = false,
  viewerBalance,
}: {
  suggestions: GameSuggestionWithMeta[];
  loggedIn?: boolean;
  canInteract?: boolean;
  viewerBalance?: number | null;
}) {
  const sorted = [...suggestions].sort((a, b) => {
    if (b.totalVotes !== a.totalVotes) {
      return b.totalVotes - a.totalVotes;
    }

    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });

  return (
    <div className="grid gap-4">
      {sorted.map((suggestion, index) => (
        <GameSuggestionCard
          key={suggestion.id}
          suggestion={suggestion}
          index={index}
          loggedIn={loggedIn}
          canBoost={canInteract}
          viewerBalance={viewerBalance}
        />
      ))}
    </div>
  );
}
