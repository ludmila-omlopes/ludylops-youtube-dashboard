import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { ok } from "@/lib/api";
import { placeBetFromChatCommand } from "@/lib/db/repository";
import { streamerbotChatBetSchema } from "@/lib/streamerbot/schemas";
import { verifySignedRequest } from "@/lib/streamerbot/security";
import { formatPipetz } from "@/lib/utils";

function mapChatBetReply(message: string, viewerName?: string) {
  const prefix = viewerName ? `${viewerName}, ` : "";

  switch (message) {
    case "saldo_insuficiente":
      return `${prefix}voce nao tem pipetz suficientes para essa aposta.`;
    case "aposta_ja_registrada":
      return `${prefix}voce ja apostou nessa rodada.`;
    case "bet_not_open":
      return "Essa aposta nao esta aberta no momento.";
    case "bet_closed":
      return "A janela de aposta ja fechou.";
    case "invalid_option":
      return "Opcao invalida. Use o numero ou nome exibido na aposta.";
    case "multiple_open_bets":
      return "Ha mais de uma aposta aberta. Configure lojaneon.activeBetId ou envie betId no comando do Streamer.bot.";
    case "Aposta nao encontrada.":
      return "Nenhuma aposta aberta foi encontrada para esse comando.";
    default:
      return "Nao consegui registrar a aposta agora.";
  }
}

export async function POST(request: Request) {
  const raw = await request.text();
  const timestamp = request.headers.get("x-timestamp");
  const signature = request.headers.get("x-signature");

  const valid = verifySignedRequest({
    body: raw,
    timestamp,
    signature,
    secret: env.STREAMERBOT_SHARED_SECRET,
  });
  if (!valid) {
    console.warn("[streamerbot/bets/place] Invalid signature.", {
      hasSecret: Boolean(env.STREAMERBOT_SHARED_SECRET),
      hasTimestamp: Boolean(timestamp),
      hasSignature: Boolean(signature),
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid signature.",
        replyMessage: "Assinatura invalida no comando de aposta.",
      },
      { status: 401 },
    );
  }

  try {
    const payload = streamerbotChatBetSchema.parse(JSON.parse(raw));
    const result = await placeBetFromChatCommand(payload);
    const viewerName = payload.youtubeDisplayName ?? result.viewer.youtubeDisplayName;
    const optionIndex = result.option.sortOrder + 1;
    const wasTopUp = result.entry.amount > payload.amount;

    console.info("[streamerbot/bets/place] Registered chat bet.", {
      betId: result.bet.id,
      optionId: result.option.id,
      viewerId: result.viewer.id,
      viewerExternalId: payload.viewerExternalId,
      amount: payload.amount,
      source: payload.source,
    });

    return ok({
      betId: result.bet.id,
      question: result.bet.question,
      optionId: result.option.id,
      optionIndex,
      optionLabel: result.option.label,
      viewerId: result.viewer.id,
      viewerExternalId: payload.viewerExternalId,
      amount: payload.amount,
      replyMessage: wasTopUp
        ? `${viewerName} adicionou ${formatPipetz(payload.amount)} em #${optionIndex} ${result.option.label}. Total: ${formatPipetz(result.entry.amount)}.`
        : `${viewerName} apostou ${formatPipetz(payload.amount)} em #${optionIndex} ${result.option.label}.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao registrar aposta.";
    const payloadSnapshot =
      (() => {
        try {
          const payload = JSON.parse(raw) as {
            youtubeDisplayName?: string;
            viewerExternalId?: string;
            betId?: string;
            optionId?: string;
            optionIndex?: number;
            optionLabel?: string;
            amount?: number;
          };
          return payload;
        } catch {
          return null;
        }
      })();
    const viewerName = payloadSnapshot?.youtubeDisplayName ?? undefined;

    console.error("[streamerbot/bets/place] Failed to process payload.", {
      error,
      viewerExternalId: payloadSnapshot?.viewerExternalId ?? null,
      betId: payloadSnapshot?.betId ?? null,
      optionId: payloadSnapshot?.optionId ?? null,
      optionIndex: payloadSnapshot?.optionIndex ?? null,
      optionLabel: payloadSnapshot?.optionLabel ?? null,
      amount: payloadSnapshot?.amount ?? null,
    });
    return NextResponse.json(
      {
        ok: false,
        error: message,
        replyMessage: mapChatBetReply(message, viewerName),
      },
      { status: 400 },
    );
  }
}
