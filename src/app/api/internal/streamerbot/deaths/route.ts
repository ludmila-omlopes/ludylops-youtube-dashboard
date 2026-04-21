import { NextResponse } from "next/server";

import { ok } from "@/lib/api";
import { runDeathCounterCommand } from "@/lib/db/repository";
import { env } from "@/lib/env";
import { streamerbotDeathCounterCommandSchema } from "@/lib/streamerbot/schemas";
import { verifySignedRequest } from "@/lib/streamerbot/security";

function mapDeathCounterReply(message: string, requestedBy?: string) {
  const prefix = requestedBy ? `${requestedBy}, ` : "";

  switch (message) {
    case "reset_confirmation_required":
      return `${prefix}reset bloqueado. Reenvie o comando com confirmReset=true para zerar o contador.`;
    default:
      return `${prefix}nao consegui processar o contador de mortes agora.`;
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
    console.warn("[streamerbot/deaths] Invalid signature.", {
      hasSecret: Boolean(env.STREAMERBOT_SHARED_SECRET),
      hasTimestamp: Boolean(timestamp),
      hasSignature: Boolean(signature),
    });
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid signature.",
        replyMessage: "Assinatura invalida no comando de mortes.",
      },
      { status: 401 },
    );
  }

  try {
    const payload = streamerbotDeathCounterCommandSchema.parse(JSON.parse(raw));
    const result = await runDeathCounterCommand(payload);

    console.info("[streamerbot/deaths] Processed command.", {
      action: payload.action,
      scopeType: result.counter.scopeType,
      scopeKey: result.counter.scopeKey ?? "global",
      amount: payload.amount,
      requestedBy: payload.requestedBy,
      count: result.count,
      mode: result.mode,
    });

    return ok({
      action: result.action,
      count: result.count,
      counterKey: result.counter.key,
      scopeType: result.counter.scopeType,
      scopeKey: result.counter.scopeKey,
      lastResetAt: result.counter.lastResetAt,
      updatedAt: result.counter.updatedAt,
      replyMessage: result.replyMessage,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar contador de mortes.";
    const requestedBy =
      (() => {
        try {
          const payload = JSON.parse(raw) as { requestedBy?: string };
          return payload.requestedBy;
        } catch {
          return undefined;
        }
      })() ?? undefined;

    console.error("[streamerbot/deaths] Failed to process payload.", error);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        replyMessage: mapDeathCounterReply(message, requestedBy),
      },
      { status: 400 },
    );
  }
}
