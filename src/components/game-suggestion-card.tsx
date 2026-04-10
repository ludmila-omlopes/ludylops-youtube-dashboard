"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GameSuggestionWithMeta } from "@/lib/types";
import { formatPipetz } from "@/lib/utils";

const statusLabels: Record<GameSuggestionWithMeta["status"], string> = {
  open: "Aberta",
  accepted: "Aceita",
  played: "Ja joguei",
  rejected: "Fechada",
};

const statusColors: Record<GameSuggestionWithMeta["status"], string> = {
  open: "var(--color-sky)",
  accepted: "var(--color-mint)",
  played: "var(--color-lavender)",
  rejected: "var(--color-periwinkle)",
};

const cardBgCycle = [
  "surface-card",
  "surface-card-alt",
  "surface-card-accent",
  "surface-card",
  "surface-card-alt",
  "surface-card",
];

function mapSuggestionError(message: string) {
  switch (message) {
    case "saldo_insuficiente":
      return "Saldo insuficiente.";
    case "suggestion_not_found":
      return "Sugestao nao encontrada.";
    case "suggestion_not_open":
      return "So da para dar boost em sugestoes abertas.";
    case "invalid_amount":
      return "Digite um valor inteiro positivo.";
    default:
      return message;
  }
}

export function GameSuggestionCard({
  suggestion,
  index = 0,
  loggedIn = false,
  canBoost = false,
  viewerBalance,
}: {
  suggestion: GameSuggestionWithMeta;
  index?: number;
  loggedIn?: boolean;
  canBoost?: boolean;
  viewerBalance?: number | null;
}) {
  const router = useRouter();
  const [boostAmount, setBoostAmount] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleBoost() {
    const parsed = Number.parseInt(boostAmount, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setFeedback("Digite um valor inteiro positivo.");
      return;
    }

    if (!canBoost) {
      setFeedback(loggedIn ? "Sua conta ainda nao esta pronta para dar boost." : "Faca login para dar boost.");
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const response = await fetch(`/api/me/game-suggestions/${suggestion.id}/boost`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ amount: parsed }),
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setFeedback(mapSuggestionError(payload.error ?? "Falha ao dar boost."));
        return;
      }

      setBoostAmount("");
      setFeedback("Boost enviado.");
      router.refresh();
    });
  }

  const bgClass = cardBgCycle[index % cardBgCycle.length];

  return (
    <div className={`card-brutal relative overflow-hidden p-5 ${bgClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className="text-xl font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {suggestion.name}
            </h3>
            <span
              className="sticker px-2 py-0.5 text-[10px] text-[var(--color-ink)]"
              style={{ backgroundColor: statusColors[suggestion.status] }}
            >
              {statusLabels[suggestion.status]}
            </span>
          </div>
          {suggestion.description ? (
            <p className="mt-1 text-sm opacity-80">
              {suggestion.description}
            </p>
          ) : null}
          <p className="mono mt-2 text-xs opacity-75">
            Sugerido por {suggestion.suggestedBy}
          </p>
          {suggestion.viewerBoostTotal > 0 ? (
            <p className="mono mt-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">
              seu boost: {formatPipetz(suggestion.viewerBoostTotal)}
            </p>
          ) : null}
        </div>

        <div className="rounded-[var(--radius)] border-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] px-4 py-2 text-center shadow-purple">
          <p
            className="text-2xl font-bold text-[var(--color-purple-bold)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatPipetz(suggestion.totalVotes)}
          </p>
          <p className="mono text-[9px] uppercase tracking-[0.15em] text-[var(--color-ink-soft)]">
            boost total
          </p>
          {typeof viewerBalance === "number" ? (
            <p className="mono mt-1 text-[9px] uppercase tracking-[0.15em] text-[var(--color-ink-soft)]">
              saldo {formatPipetz(viewerBalance)}
            </p>
          ) : null}
        </div>
      </div>

      {suggestion.status === "open" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius)] border-2 border-dashed border-[var(--color-ink)] bg-[var(--color-paper)]/60 p-3">
          <span className="text-xs font-bold uppercase text-[var(--color-ink-soft)]">Boost:</span>
          <Input
            type="number"
            min="1"
            placeholder="Pipetz"
            value={boostAmount}
            onChange={(e) => setBoostAmount(e.target.value)}
            className="w-24 px-3 py-2"
          />
          <Button
            type="button"
            onClick={handleBoost}
            disabled={isPending}
            size="sm"
          >
            {isPending ? "Enviando..." : "Dar boost"}
          </Button>
        </div>
      ) : null}

      {!loggedIn ? (
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
          faca login para sugerir e dar boost
        </p>
      ) : null}

      {feedback ? (
        <div className="sticker sticker-pop accent-chip mt-3 inline-flex px-2 py-1 text-xs">
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
