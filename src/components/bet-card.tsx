"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BetWithOptionsRecord } from "@/lib/types";
import { formatPipetz } from "@/lib/utils";

function timeLeft(closesAt: string, nowMs: number): string {
  const diff = new Date(closesAt).getTime() - nowMs;
  if (diff <= 0) return "Encerrada";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h ${mins}min restantes`;
  return `${mins}min restantes`;
}

function statusLabel(bet: BetWithOptionsRecord, nowMs: number) {
  if (bet.status === "resolved") return "Resolvida";
  if (bet.status === "cancelled") return "Cancelada";
  if (bet.status === "locked") return "Travada";
  return timeLeft(bet.closesAt, nowMs);
}

function mapError(message: string) {
  switch (message) {
    case "saldo_insuficiente":
      return "Saldo insuficiente.";
    case "aposta_ja_registrada":
      return "Você já apostou nesta rodada.";
    case "bet_not_open":
      return "A aposta não está aberta.";
    case "bet_closed":
      return "A janela de aposta ja fechou.";
    case "invalid_option":
      return "Opção inválida.";
    case "invalid_amount":
      return "Valor inválido.";
    default:
      return message;
  }
}

const accentColors = [
  "var(--color-purple-mid)",
  "var(--color-blue)",
  "var(--color-pink-hot)",
  "var(--color-mint)",
  "var(--color-yellow)",
  "var(--color-periwinkle)",
];

const optionBgs = [
  "surface-card",
  "surface-card-alt",
  "surface-card-accent",
  "bg-[var(--color-paper)]",
  "surface-card",
  "surface-card-alt",
];

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
  viewerBalance,
  loggedIn = false,
  canBet = false,
}: {
  bet: BetWithOptionsRecord;
  index?: number;
  viewerBalance?: number | null;
  loggedIn?: boolean;
  canBet?: boolean;
}) {
  const router = useRouter();
  const [draftSelectedOption, setDraftSelectedOption] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (bet.status !== "open") {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [bet.status]);

  const isOpen = bet.status === "open" && new Date(bet.closesAt).getTime() > nowMs;
  const isResolved = bet.status === "resolved";
  const hasViewerBet = Boolean(bet.viewerPosition);
  const selectedOption = bet.viewerPosition?.optionId ?? draftSelectedOption;
  const selectedOptionLabel =
    bet.options.find((option) => option.id === selectedOption)?.label ?? "opção selecionada";
  const accent = accentColors[index % accentColors.length];

  function handlePlace() {
    const parsed = Number.parseInt(amount, 10);
    if (!selectedOption || !Number.isInteger(parsed) || parsed <= 0) {
      setFeedback("Digite um valor valido.");
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const response = await fetch(`/api/me/bets/${bet.id}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          optionId: selectedOption,
          amount: parsed,
          source: "web",
        }),
      });

      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setFeedback(mapError(payload.error ?? "Falha ao registrar aposta."));
        return;
      }

      setAmount("");
      setFeedback(hasViewerBet ? "Aposta reforcada." : "Aposta registrada.");
      router.refresh();
    });
  }

  return (
    <div
      className="panel-inset p-5"
      style={{
        borderLeftColor: accent,
        backgroundColor: isResolved ? "var(--color-lilac)" : "var(--color-paper)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {bet.question}
          </h3>
          <p className="mono mt-1 text-xs uppercase tracking-[0.15em] text-[var(--color-ink-soft)]">
            {statusLabel(bet, nowMs)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="badge-brutal px-3 py-1.5 text-xs text-[var(--color-ink)]"
            style={{
              backgroundColor: `color-mix(in srgb, ${accent} 18%, var(--color-paper-warm) 82%)`,
            }}
          >
            Pool: {formatPipetz(bet.totalPool)}
          </div>
          {typeof viewerBalance === "number" ? (
            <div className="retro-label neutral-chip">
              saldo {formatPipetz(viewerBalance)}
            </div>
          ) : null}
        </div>
      </div>

      {bet.options.length > 0 && bet.totalPool > 0 ? (
        <div className="mt-4 flex h-4 overflow-hidden rounded-full border-2 border-[var(--color-ink)]">
          {bet.options.map((opt, i) => {
            const pct = Math.max((opt.poolAmount / bet.totalPool) * 100, 2);
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

      <div className="mt-3 grid gap-1.5">
        {bet.options.map((opt, i) => {
          const isWinner = isResolved && bet.winningOptionId === opt.id;
          const isViewerPick = bet.viewerPosition?.optionId === opt.id;
          const pct = bet.totalPool > 0 ? Math.round((opt.poolAmount / bet.totalPool) * 100) : 0;
          const bgClass = optionBgs[i % optionBgs.length];
          const selectable = isOpen && canBet && !hasViewerBet;

          return (
            <button
              key={opt.id}
              type="button"
              disabled={!selectable}
              onClick={() => setDraftSelectedOption(selectedOption === opt.id ? null : opt.id)}
              className={`card-flat relative flex items-center justify-between overflow-hidden p-3 text-left ${
                isWinner
                  ? "border-[var(--color-ink)] bg-[var(--color-mint)] ring-2 ring-[var(--color-ink)]"
                  : selectedOption === opt.id || isViewerPick
                    ? "border-[var(--color-purple-bold)] bg-[var(--color-lavender)] ring-2 ring-[var(--color-purple-bold)]"
                    : bgClass
              } ${selectable ? "cursor-pointer" : "cursor-default"}`}
            >
              {!isWinner && selectedOption !== opt.id && !isViewerPick ? (
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 opacity-[0.12]"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColors[i % barColors.length],
                  }}
                />
              ) : null}

              <div className="relative flex items-center gap-2">
                <span className="rounded-[var(--radius)] border-2 border-[var(--color-ink)] bg-[var(--color-paper)] px-2 py-0.5 text-[10px] font-black uppercase">
                  #{i + 1}
                </span>
                <span
                  className="inline-block h-3 w-3 shrink-0 rounded-full border-2 border-[var(--color-ink)]"
                  style={{
                    backgroundColor: barColors[i % barColors.length],
                  }}
                />
                <span className="font-bold">
                  {isWinner ? "Venceu: " : ""}
                  {opt.label}
                </span>
              </div>

              <div className="relative flex items-center gap-2">
                {isViewerPick ? (
                  <span className="mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
                    sua aposta
                  </span>
                ) : null}
                <span className="mono text-xs font-bold text-[var(--color-ink-soft)]">
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

      {isOpen ? (
        <p className="mono mt-3 text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">
          chat: !bet &lt;opção&gt; &lt;valor&gt; ex.: !bet 1 100
        </p>
      ) : null}

      {bet.viewerPosition ? (
        <div className="surface-card mt-4 rounded-[var(--radius)] p-3 text-sm text-[var(--color-ink)]">
          <p className="font-bold uppercase">Sua posicao</p>
          <p className="mt-1">
            {formatPipetz(bet.viewerPosition.amount)} em{" "}
            {bet.options.find((option) => option.id === bet.viewerPosition?.optionId)?.label ?? "opção"}
          </p>
          {isOpen && canBet ? (
            <p className="mt-1 text-[var(--color-ink-soft)]">
              Você pode adicionar mais pipetz nessa mesma opção até a janela fechar.
            </p>
          ) : null}
          {bet.viewerPosition.payoutAmount !== null ? (
            <p className="mt-1 text-[var(--color-ink-soft)]">
              retorno: {formatPipetz(bet.viewerPosition.payoutAmount)}
            </p>
          ) : null}
          {bet.viewerPosition.refundedAt ? (
            <p className="mt-1 text-[var(--color-ink-soft)]">aposta reembolsada</p>
          ) : null}
        </div>
      ) : null}

      {isOpen && selectedOption && canBet ? (
        <div className="surface-card mt-4 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border-2 border-dashed border-[var(--color-ink)] p-3">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-ink-soft)]">
            {hasViewerBet ? `Adicionar em ${selectedOptionLabel}?` : "Quanto apostar?"}
          </span>
          <Input
            type="number"
            min="1"
            placeholder="Pipetz"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-28 px-3 py-2"
          />
          <Button
            type="button"
            onClick={handlePlace}
            disabled={isPending}
            size="sm"
          >
            {isPending ? "Enviando..." : hasViewerBet ? "Adicionar mais" : "Apostar"}
          </Button>
        </div>
      ) : null}

      {!loggedIn ? (
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
          faça login para apostar
        </p>
      ) : null}
      {loggedIn && !canBet && !bet.viewerPosition ? (
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
          vincule sua conta ao chat para apostar
        </p>
      ) : null}
      {feedback ? (
        <div className="sticker sticker-pop accent-chip mt-3 inline-flex px-3 py-1.5 text-xs">
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
