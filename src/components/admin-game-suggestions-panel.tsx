"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { GameSuggestionWithMeta } from "@/lib/types";
import { formatDateTime, formatPipetz } from "@/lib/utils";

const statusLabels: Record<GameSuggestionWithMeta["status"], string> = {
  open: "Aberta",
  accepted: "Aceita",
  played: "Jogada",
  rejected: "Rejeitada",
};

const statusBgMap: Record<GameSuggestionWithMeta["status"], string> = {
  open: "var(--color-sky)",
  accepted: "var(--color-mint)",
  played: "var(--color-lavender)",
  rejected: "var(--color-periwinkle)",
};

function mapSuggestionError(message: string) {
  switch (message) {
    case "suggestion_not_found":
      return "Sugestao nao encontrada.";
    default:
      return message;
  }
}

export function AdminGameSuggestionsPanel({
  suggestions,
}: {
  suggestions: GameSuggestionWithMeta[];
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitStatus(suggestionId: string, status: GameSuggestionWithMeta["status"]) {
    setFeedback(null);
    startTransition(async () => {
      const response = await fetch(`/api/admin/game-suggestions/${suggestionId}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setFeedback(mapSuggestionError(payload.error ?? "Falha ao atualizar sugestao."));
        return;
      }

      setFeedback("Status atualizado.");
      router.refresh();
    });
  }

  return (
    <section className="panel bg-[var(--color-lavender)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono text-xs uppercase tracking-[0.3em] text-[var(--color-ink-soft)]">
            Jogos
          </p>
          <h2
            className="mt-2 text-3xl uppercase"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Fila de sugestoes
          </h2>
        </div>
        {feedback ? (
          <div className="retro-label neutral-chip">
            {feedback}
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-3">
        {suggestions.length === 0 ? (
          <div className="card-brutal-static p-4 text-sm font-bold text-[var(--color-ink-soft)]">
            Nenhuma sugestao cadastrada.
          </div>
        ) : null}

        {suggestions.map((suggestion) => (
          <article key={suggestion.id} className="card-brutal-static p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold">{suggestion.name}</p>
                  <span
                    className="badge-brutal px-2 py-1 text-[10px] text-[var(--color-ink)]"
                    style={{ backgroundColor: statusBgMap[suggestion.status] }}
                  >
                    {statusLabels[suggestion.status]}
                  </span>
                </div>
                {suggestion.description ? (
                  <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
                    {suggestion.description}
                  </p>
                ) : null}
                <p className="mono mt-2 text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
                  por {suggestion.suggestedBy} . {formatDateTime(suggestion.createdAt)}
                </p>
              </div>

              <span className="retro-label neutral-chip">
                {formatPipetz(suggestion.totalVotes)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {suggestion.status !== "accepted" ? (
                <button
                  type="button"
                  onClick={() => submitStatus(suggestion.id, "accepted")}
                  disabled={isPending}
                  className="btn-brutal bg-[var(--color-mint)] px-3 py-2 text-xs disabled:opacity-60"
                >
                  Aceitar
                </button>
              ) : null}
              {suggestion.status !== "played" ? (
                <button
                  type="button"
                  onClick={() => submitStatus(suggestion.id, "played")}
                  disabled={isPending}
                  className="btn-brutal bg-[var(--color-paper)] px-3 py-2 text-xs disabled:opacity-60"
                >
                  Marcar jogado
                </button>
              ) : null}
              {suggestion.status !== "rejected" ? (
                <button
                  type="button"
                  onClick={() => submitStatus(suggestion.id, "rejected")}
                  disabled={isPending}
                  className="btn-brutal bg-[var(--color-rose)] px-3 py-2 text-xs disabled:opacity-60"
                >
                  Rejeitar
                </button>
              ) : null}
              {suggestion.status !== "open" ? (
                <button
                  type="button"
                  onClick={() => submitStatus(suggestion.id, "open")}
                  disabled={isPending}
                  className="btn-brutal bg-[var(--color-sky)] px-3 py-2 text-xs disabled:opacity-60"
                >
                  Reabrir
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
