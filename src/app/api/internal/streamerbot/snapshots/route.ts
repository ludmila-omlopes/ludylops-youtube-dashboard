import { fail, ok } from "@/lib/api";
import { ingestBalanceSnapshot } from "@/lib/db/repository";
import { env } from "@/lib/env";
import { snapshotSchema } from "@/lib/streamerbot/schemas";
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
    console.warn("[streamerbot/snapshots] Invalid signature.", {
      hasSecret: Boolean(env.STREAMERBOT_SHARED_SECRET),
      hasTimestamp: Boolean(timestamp),
      hasSignature: Boolean(signature),
    });
    return fail("Invalid signature.", 401);
  }

  try {
    const payload = snapshotSchema.parse(JSON.parse(raw));
    const result = await ingestBalanceSnapshot(payload);
    console.info("[streamerbot/snapshots] Processed snapshot.", {
      eventId: payload.eventId,
      viewerCount: payload.viewers.length,
      result,
    });
    return ok(result);
  } catch (error) {
    console.error("[streamerbot/snapshots] Failed to process payload.", error);
    return fail("Invalid payload.", 400);
  }
}
