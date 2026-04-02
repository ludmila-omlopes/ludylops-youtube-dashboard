"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { validateGameSuggestionDraft } from "@/lib/game-suggestions/service";
import { formatPipetz } from "@/lib/utils";

function mapSuggestionError(message: string) {
  switch (message) {
    case "suggestion_already_exists":
      return "Esse jogo ja esta na lista aberta.";
    case "invalid_name":
      return "Escreva um nome valido para o jogo.";
    default:
      return message;
  }
}

export function GameSuggestForm({
  loggedIn = false,
  canSuggest = false,
  viewerBalance,
}: {
  loggedIn?: boolean;
  canSuggest?: boolean;
  viewerBalance?: number | null;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateGameSuggestionDraft({
      name,
      description,
    });

    if (validationError) {
      setFeedback(validationError);
      return;
    }

    if (!canSuggest) {
      setFeedback(loggedIn ? "Sua conta ainda nao esta pronta para sugerir." : "Faca login para sugerir.");
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const response = await fetch("/api/me/game-suggestions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setFeedback(mapSuggestionError(payload.error ?? "Falha ao enviar sugestao."));
        return;
      }

      setName("");
      setDescription("");
      setFeedback("Sugestao enviada.");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="panel surface-section relative overflow-hidden p-5 text-[var(--color-ink)] sm:p-6"
    >
      <div className="bg-dots-light pointer-events-none absolute inset-0 opacity-15" />

      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3
              className="text-lg font-bold uppercase"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sugira um jogo
            </h3>
            <p className="mt-2 text-sm text-[var(--color-ink-soft)]">
              Se tiver algo que voce quer muito me ver jogando, manda aqui.
            </p>
          </div>
          {typeof viewerBalance === "number" ? (
            <span className="retro-label neutral-chip">
              saldo {formatPipetz(viewerBalance)}
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3">
          <input
            type="text"
            placeholder="Nome do jogo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            className="rounded-[var(--radius)] border-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] px-4 py-3 text-sm font-bold shadow-[3px_3px_0_var(--shadow-color)]"
          />
          <textarea
            placeholder="Por que eu deveria jogar isso? (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={500}
            className="rounded-[var(--radius)] border-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] px-4 py-3 text-sm shadow-[3px_3px_0_var(--shadow-color)]"
          />
          <button
            type="submit"
            disabled={isPending}
            className="btn-brutal ink-button px-6 py-3 text-sm disabled:opacity-60"
          >
            {isPending ? "Enviando..." : "Enviar sugestao"}
          </button>
        </div>

        {!loggedIn ? (
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
            faca login para sugerir e dar boost
          </p>
        ) : null}

        {feedback ? (
          <div className="sticker sticker-pop accent-chip mt-3 inline-flex px-3 py-1.5 text-sm">
            {feedback}
          </div>
        ) : null}
      </div>
    </form>
  );
}
