import { NextResponse } from "next/server";

import { runQuoteCommandFromChat } from "@/lib/db/repository";
import { env } from "@/lib/env";
import { streamerbotQuoteCommandSchema } from "@/lib/streamerbot/schemas";
import { verifySignedRequest } from "@/lib/streamerbot/security";

function formatQuoteReply(input: { quoteNumber: number; body: string }) {
  return `Quote #${input.quoteNumber}: "${input.body}"`;
}

function mapChatQuoteReply(input: {
  message: string;
  action?: "create" | "get";
  quoteId?: number;
}) {
  switch (input.message) {
    case "quote_permission_denied":
      return "Apenas mods, broadcaster ou admin podem salvar quotes.";
    case "quote_not_found":
      return input.quoteId
        ? `Quote #${input.quoteId} nao encontrada.`
        : "Quote nao encontrada.";
    case "quote_list_empty":
      return "Nenhuma quote cadastrada ainda.";
    case "quote_text_required":
      return "Envie o texto da quote junto do comando.";
    case "viewer_external_id_required":
      return "Nao consegui identificar quem executou o comando.";
    default:
      return input.action === "create"
        ? "Nao consegui salvar a quote agora."
        : "Nao consegui buscar a quote agora.";
  }
}

function readPayloadContext(raw: string) {
  try {
    const payload = JSON.parse(raw) as {
      action?: "create" | "get";
      quoteId?: number;
    };

    return {
      action: payload.action,
      quoteId: payload.quoteId,
    };
  } catch {
    return {};
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
    console.warn("[streamerbot/quotes] Invalid signature.", {
      hasSecret: Boolean(env.STREAMERBOT_SHARED_SECRET),
      hasTimestamp: Boolean(timestamp),
      hasSignature: Boolean(signature),
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid signature.",
        replyMessage: "Assinatura invalida no comando de quotes.",
      },
      { status: 401 },
    );
  }

  try {
    const payload = streamerbotQuoteCommandSchema.parse(JSON.parse(raw));
    const result = await runQuoteCommandFromChat(payload);
    const replyMessage =
      result.action === "create"
        ? `Quote #${result.quote.quoteNumber} salva: "${result.quote.body}"`
        : formatQuoteReply(result.quote);

    console.info("[streamerbot/quotes] Processed quote command.", {
      action: payload.action,
      quoteNumber: result.quote.quoteNumber,
      viewerExternalId: payload.viewerExternalId ?? null,
      source: payload.source,
    });

    return NextResponse.json({
      ok: true,
      replyMessage,
      data: {
        action: result.action,
        quoteId: result.quote.quoteNumber,
        quote: result.quote,
        replyMessage,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar quote.";
    const context = readPayloadContext(raw);

    console.error("[streamerbot/quotes] Failed to process payload.", error);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        replyMessage: mapChatQuoteReply({
          message,
          action: context.action,
          quoteId: context.quoteId,
        }),
      },
      { status: 400 },
    );
  }
}
