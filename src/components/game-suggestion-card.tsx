"use client";

import { useState } from "react";
import type { DemoGameSuggestion } from "@/lib/demo-data";
import { formatPipetz } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  open: "Aberta",
  accepted: "Aceita!",
  played: "Ja jogou",
  rejected: "Recusada",
};

const statusColors: Record<string, string> = {
  open: "var(--color-sky)",
  accepted: "var(--color-mint)",
  played: "var(--color-lavender)",
  rejected: "var(--color-periwinkle)",
};

const cardBgCycle = [
  "bg-[var(--color-lavender)]",
  "bg-[var(--color-sky)]",
  "bg-[var(--color-mint)]",
  "bg-[var(--color-rose)]",
  "bg-[var(--color-periwinkle)]",
  "bg-[var(--color-yellow)]",
];

export function GameSuggestionCard({
  suggestion,
  index = 0,
}: {
  suggestion: DemoGameSuggestion;
  index?: number;
}) {
  const [boosted, setBoosted] = useState(false);
  const [boostAmount, setBoostAmount] = useState("");

  function handleBoost() {
    if (!boostAmount) return;
    setBoosted(true);
    setBoostAmount("");
  }

  const bgClass = cardBgCycle[index % cardBgCycle.length];

  return (
    <div className={`card-brutal relative overflow-hidden p-5 ${bgClass}`}>
      {/* Numero de votos em destaque */}
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
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {suggestion.description}
            </p>
          ) : null}
          <p className="mono mt-2 text-xs text-[var(--color-muted)]">
            Sugerido por {suggestion.suggestedBy}
          </p>
        </div>

        {/* Badge de votos com sombra colorida */}
        <div className="rounded-[var(--radius)] border-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] px-4 py-2 text-center shadow-purple">
          <p
            className="text-2xl font-bold text-[var(--color-purple-bold)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatPipetz(suggestion.totalVotes)}
          </p>
          <p className="mono text-[9px] uppercase tracking-[0.15em] text-[var(--color-muted)]">
            pipetz boost
          </p>
        </div>
      </div>

      {suggestion.status === "open" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius)] border-2 border-dashed border-[var(--color-ink)] bg-[var(--color-paper)]/60 p-3">
          <span className="text-xs font-bold uppercase text-[var(--color-muted)]">⚡ Boost:</span>
          <input
            type="number"
            min="1"
            placeholder="Pipetz"
            value={boostAmount}
            onChange={(e) => setBoostAmount(e.target.value)}
            className="w-24 rounded-[var(--radius)] border-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] px-3 py-2 text-sm font-bold"
          />
          <button
            type="button"
            onClick={handleBoost}
            className="btn-brutal bg-[var(--color-purple-mid)] px-4 py-2 text-xs text-white"
          >
            Dar boost 🚀
          </button>
          {boosted ? (
            <span className="sticker sticker-pop bg-[var(--color-mint)] px-2 py-1 text-xs">
              ✓ Boost!
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
