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
  const visibleSuggestions = sorted.filter((suggestion) => suggestion.status !== "rejected");

  return (
    <div className="grid gap-4">
      {visibleSuggestions.map((suggestion, index) => (
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
