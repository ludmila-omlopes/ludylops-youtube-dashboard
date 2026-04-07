"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { validateCreateBetDraft } from "@/lib/bets/admin";
import { evaluateBetLifecycleAction } from "@/lib/bets/service";
import type { BetWithOptionsRecord } from "@/lib/types";
import { formatPipetz } from "@/lib/utils";

function toLocalDateTimeInput(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function minLocalDateTimeInput() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function mapAdminBetError(message: string) {
  switch (message) {
    case "bet_not_open":
      return "So e possivel travar apostas abertas.";
    case "bet_not_locked":
      return "So e possivel resolver apostas travadas.";
    case "bet_already_locked":
      return "A aposta ja esta travada.";
    case "bet_already_resolved":
      return "A aposta ja foi resolvida.";
    case "bet_already_cancelled":
      return "A aposta ja foi cancelada.";
    default:
      return message;
  }
}

export function AdminBetsPanel({ bets }: { bets: BetWithOptionsRecord[] }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [optionsText, setOptionsText] = useState("Sim\nNao");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [resolveSelections, setResolveSelections] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  async function runAction(url: string, body?: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const raw = await response.text();
    let payload: { ok?: boolean; error?: string } | null = null;

    if (raw) {
      try {
        payload = JSON.parse(raw) as { ok?: boolean; error?: string };
      } catch {
        payload = null;
      }
    }

    if (!response.ok || !payload?.ok) {
      if (payload?.error) {
        throw new Error(payload.error);
      }

      const trimmed = raw.trim();
      if (trimmed && !trimmed.startsWith("<")) {
        throw new Error(trimmed);
      }

      throw new Error("Falha na operacao.");
    }
  }

  function handleCreate() {
    const options = optionsText
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    const closesAtDate = new Date(closesAt);
    const closesAtIso = Number.isFinite(closesAtDate.getTime()) ? closesAtDate.toISOString() : "";
    const validationError = validateCreateBetDraft({
      question: question.trim(),
      closesAt: closesAtIso,
      options,
    });

    if (validationError) {
      setFeedback(validationError);
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      try {
        await runAction("/api/admin/bets", {
          question: question.trim(),
          closesAt: closesAtIso,
          options,
          startOpen: true,
        });
        setQuestion("");
        setClosesAt("");
        setOptionsText("Sim\nNao");
        setFeedback("Aposta criada.");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "Falha ao criar aposta.");
      }
    });
  }

  function submitAction(url: string, body?: Record<string, unknown>) {
    setFeedback(null);
    startTransition(async () => {
      try {
        await runAction(url, body);
        setFeedback("Operacao concluida.");
        router.refresh();
      } catch (error) {
        setFeedback(
          error instanceof Error ? mapAdminBetError(error.message) : "Falha ao executar operacao.",
        );
      }
    });
  }

  return (
    <section className="landing-plane landing-divider bg-[var(--color-mint)] py-8 sm:py-10">
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mono text-xs uppercase tracking-[0.3em] text-[var(--color-ink)]/50">
            Apostas
          </p>
          <h2
            className="mt-2 text-3xl uppercase"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Operacao da live
          </h2>
        </div>
        {feedback ? (
          <div className="retro-label neutral-chip">
            {feedback}
          </div>
        ) : null}
      </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="card-brutal-static p-5">
          <p className="mono text-xs uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
            Nova aposta
          </p>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-black uppercase tracking-[0.14em] text-[var(--color-ink)]">
                Pergunta da aposta
              </span>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ex.: Ela passa o boss sem morrer?"
                minLength={6}
                maxLength={255}
                className="px-3 py-2"
              />
              <span className="text-xs font-bold text-[var(--color-ink-soft)]">
                Entre 6 e 255 caracteres.
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black uppercase tracking-[0.14em] text-[var(--color-ink)]">
                Encerrar apostas em
              </span>
              <Input
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
                min={minLocalDateTimeInput()}
                className="px-3 py-2"
              />
              <span className="text-xs font-bold text-[var(--color-ink-soft)]">
                Data e hora locais em que a janela de apostas fecha. Depois desse horario, ninguem mais consegue apostar.
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-black uppercase tracking-[0.14em] text-[var(--color-ink)]">
                Opcoes
              </span>
              <Textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                rows={5}
                maxLength={1550}
                placeholder={"Sim\nNao"}
                className="min-h-32 px-3 py-2 font-bold"
              />
              <span className="text-xs font-bold text-[var(--color-ink-soft)]">
                Use uma opcao por linha. Minimo de 2 e maximo de 6 opcoes.
              </span>
            </label>

            <Button
              type="button"
              onClick={handleCreate}
              disabled={isPending}
              size="sm"
              className="w-full sm:w-fit"
            >
              {isPending ? "Enviando..." : "Criar aposta"}
            </Button>
          </div>
        </div>

        <div className="grid gap-3">
          {bets.length === 0 ? (
            <div className="card-brutal-static p-4 text-sm font-bold text-[var(--color-ink-soft)]">
              Nenhuma aposta cadastrada.
            </div>
          ) : null}

          {bets.map((bet) => {
            const canLock = evaluateBetLifecycleAction({ action: "lock", status: bet.status }).canTransition;
            const canResolve = evaluateBetLifecycleAction({
              action: "resolve",
              status: bet.status,
            }).canTransition;
            const canCancel = evaluateBetLifecycleAction({ action: "cancel", status: bet.status }).canTransition;

            return (
              <article key={bet.id} className="card-brutal-static p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">{bet.question}</p>
                    <p className="mono mt-1 text-[10px] uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">
                      {bet.status} . fecha {toLocalDateTimeInput(bet.closesAt).replace("T", " ")}
                    </p>
                  </div>
                  <span className="retro-label neutral-chip">
                    {formatPipetz(bet.totalPool)}
                  </span>
                </div>

                <div className="mt-3 grid gap-2">
                  {bet.options.map((option) => (
                    <label key={option.id} className="flex items-center justify-between gap-3 text-sm font-bold">
                      <span>{option.label}</span>
                      <span className="mono text-xs text-[var(--color-ink-soft)]">
                        {formatPipetz(option.poolAmount)}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {canLock ? (
                    <Button
                      type="button"
                      onClick={() => submitAction(`/api/admin/bets/${bet.id}/lock`)}
                      disabled={isPending}
                      variant="neutral"
                      size="sm"
                    >
                      Travar
                    </Button>
                  ) : null}
                  {canResolve ? (
                    <>
                      <Select
                        value={resolveSelections[bet.id] || null}
                        onValueChange={(value) =>
                          setResolveSelections((current) => ({
                            ...current,
                            [bet.id]: value ?? "",
                          }))
                        }
                      >
                        <SelectTrigger size="sm" className="min-w-[220px]">
                          <SelectValue placeholder="Escolha vencedora">
                            {(value) =>
                              bet.options.find((option) => option.id === value)?.label ??
                              "Escolha vencedora"
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {bet.options.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        onClick={() =>
                          submitAction(`/api/admin/bets/${bet.id}/resolve`, {
                            winningOptionId: resolveSelections[bet.id],
                          })
                        }
                        disabled={isPending || !resolveSelections[bet.id]}
                        size="sm"
                      >
                        Resolver
                      </Button>
                    </>
                  ) : null}
                  {canCancel ? (
                    <Button
                      type="button"
                      onClick={() => submitAction(`/api/admin/bets/${bet.id}/cancel`)}
                      disabled={isPending}
                      variant="danger"
                      size="sm"
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
        </div>
      </div>
    </section>
  );
}
