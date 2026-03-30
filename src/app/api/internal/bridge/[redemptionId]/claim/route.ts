import { fail, ok } from "@/lib/api";
import { bridgeClaim } from "@/lib/db/repository";
import { env } from "@/lib/env";
import { bridgeClaimSchema } from "@/lib/streamerbot/schemas";
import { verifySignedRequest } from "@/lib/streamerbot/security";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ redemptionId: string }> },
) {
  const raw = await request.text();
  const valid = verifySignedRequest({
    body: raw,
    timestamp: request.headers.get("x-timestamp"),
    signature: request.headers.get("x-signature"),
    secret: env.BRIDGE_SHARED_SECRET,
  });
  if (!valid) {
    return fail("Invalid signature.", 401);
  }
  const { redemptionId } = await params;
  const payload = bridgeClaimSchema.parse(JSON.parse(raw));
  return ok(await bridgeClaim(redemptionId, payload.bridgeId));
}
