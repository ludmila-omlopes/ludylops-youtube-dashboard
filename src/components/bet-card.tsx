"use client";

import { useState } from "react";
import type { DemoBet } from "@/lib/demo-data";
import { formatPipetz } from "@/lib/utils";

function timeLeft(deadline: Date): string {
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return "Encerrada";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}min restantes`;
  return `${mins}min restantes`;
}

/* Cores de acento para a borda lateral de cada bet card */
const accentColors = [
  "var(--color-purple-mid)",
  "var(--color-blue)",
  "var(--color-pink-hot)",
  "var(--color-mint)",
  "var(--color-yellow)",
  "var(--color-periwinkle)",
];

/* Fundos para opções — sem sombra, só cor */
const optionBgs = [
  "bg-[var(--color-lavender)]",
  "bg-[var(--color-sky)]",
  "bg-[var(--color-mint)]",
  "bg-[var(--color-periwinkle)]",
  "bg-[var(--color-rose)]",
  "bg-[var(--color-yellow)]",
];

/* Cores das barras de proporção */
const barColors = [
  "var(--color-purple)",
  "var(--color-blue)",
  "var(--color-pink)",
  "var(--color-mint)",
  "var(--color-periwinkle)",
  "var(--color-yellow)",
];

export function BetCard({
  bet,
  index = 0,
}: {
  bet: DemoBet;
  index?: number;
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [placed, setPlaced] = useState(false);

  const isOpen = bet.status === "open";
  const isResolved = bet.status === "resolved";
  const accent = accentColors[index % accentColors.length];

  function handlePlace() {
    if (!selectedOption || !amount) return;
    setPlaced(true);
    setSelectedOption(null);
    setAmount("");
  }

  return (
    <div
      className="panel-inset p-5"
      style={{
        borderLeftColor: accent,
        backgroundColor: isResolved ? "var(--color-lilac)" : "var(--color-paper)",
      }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {bet.question}
          </h3>
          <p className="mono mt-1 text-xs uppercase tracking-[0.15em] text-[var(--color-muted)]">
            {isResolved ? "Encerrada" : timeLeft(bet.deadline)}
          </p>
        </div>
        <div
          className="badge-brutal px-3 py-1.5 text-xs text-[var(--color-ink)]"
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 25%, white)` }}
        >
          Pool: {formatPipetz(bet.totalPool)} pipetz
        </div>
      </div>

      {/* Barra de proporção visual */}
      {bet.options.length > 0 && bet.totalPool > 0 ? (
        <div className="mt-4 flex h-4 overflow-hidden rounded-full border-2 border-[var(--color-ink)]">
          {bet.options.map((opt, i) => {
            const pct = Math.max(
              (opt.poolAmount / bet.totalPool) * 100,
              2,
            );
            return (
              <div
                key={opt.id}
                className="relative flex items-center justify-center overflow-hidden transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: barColors[i % barColors.length],
                }}
              >
                {pct > 15 ? (
                  <span className="mono text-[9px] font-bold text-[var(--color-ink)]">
                    {Math.round(pct)}%
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Opções — flat, sem sombra */}
      <div className="mt-3 grid gap-1.5">
        {bet.options.map((opt, i) => {
          const isWinner = isResolved && bet.winningOptionId === opt.id;
          const pct =
            bet.totalPool > 0
              ? Math.round((opt.poolAmount / bet.totalPool) * 100)
              : 0;
          const bgClass = optionBgs[i % optionBgs.length];

          return (
            <button
              key={opt.id}
              type="button"
              disabled={!isOpen}
              onClick={() =>
                setSelectedOption(
                  selectedOption === opt.id ? null : opt.id,
                )
              }
              className={`card-flat relative flex items-center justify-between overflow-hidden p-3 text-left ${
                isWinner
                  ? "border-[var(--color-ink)] bg-[var(--color-mint)] ring-2 ring-[var(--color-ink)]"
                  : selectedOption === opt.id
                    ? "border-[var(--color-purple-bold)] bg-[var(--color-lavender)] ring-2 ring-[var(--color-purple-bold)]"
                    : bgClass
              } ${isOpen ? "cursor-pointer" : "cursor-default"}`}
            >
              {/* Fill bar — fundo proporcional sutil */}
              {!isWinner && selectedOption !== opt.id ? (
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 opacity-[0.12]"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColors[i % barColors.length],
                  }}
                />
              ) : null}

              <div className="relative flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-[var(--color-ink)]"
                  style={{
                    backgroundColor: barColors[i % barColors.length],
                  }}
                />
                <span className="font-bold">
                  {isWinner ? "🏆 " : ""}
                  {opt.label}
                </span>
              </div>

              <div className="relative flex items-center gap-2">
                <span className="mono text-xs font-bold text-[var(--color-muted)]">
                  {pct}%
                </span>
                <span className="rounded-[var(--radius)] border-2 border-[var(--color-ink)] bg-[var(--color-paper)] px-2 py-0.5 text-xs font-bold">
                  {formatPipetz(opt.poolAmount)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Formulário de aposta */}
      {isOpen && selectedOption ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border-2 border-dashed border-[var(--color-ink)] bg-[var(--color-cream)] p-3">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">
            Quanto apostar?
          </span>
          <input
            type="number"
            min="1"
            placeholder="Pipetz"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 rounded-[var(--radius)] border-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] px-3 py-2 text-sm font-bold"
          />
          <button
            type="button"
            onClick={handlePlace}
            className="btn-brutal bg-[var(--color-purple-mid)] px-5 py-2.5 text-xs text-white"
          >
            Apostar 🎲
          </button>
        </div>
      ) : null}

      {placed ? (
        <div className="sticker sticker-pop mt-3 inline-flex bg-[var(--color-mint)] px-3 py-1.5 text-xs">
          ✓ Aposta registrada!
        </div>
      ) : null}
    </div>
  );
}
