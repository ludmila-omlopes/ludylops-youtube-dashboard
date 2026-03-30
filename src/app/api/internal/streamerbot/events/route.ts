import { env } from "@/lib/env";
import { fail, ok } from "@/lib/api";
import { ingestStreamerbotEvent } from "@/lib/db/repository";
import { streamerbotEventSchema } from "@/lib/streamerbot/schemas";
import { verifySignedRequest } from "@/lib/streamerbot/security";

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
    console.warn("[streamerbot/events] Invalid signature.", {
      hasSecret: Boolean(env.STREAMERBOT_SHARED_SECRET),
      hasTimestamp: Boolean(timestamp),
      hasSignature: Boolean(signature),
    });
    return fail("Invalid signature.", 401);
  }

  try {
    const payload = streamerbotEventSchema.parse(JSON.parse(raw));
    const result = await ingestStreamerbotEvent(payload);
    console.info("[streamerbot/events] Processed event.", {
      eventId: payload.eventId,
      eventType: payload.eventType,
      result,
    });
    return ok(result);
  } catch (error) {
    console.error("[streamerbot/events] Failed to process payload.", error);
    return fail("Invalid payload.", 400);
  }
}
