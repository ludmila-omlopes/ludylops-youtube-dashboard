import { fail, ok } from "@/lib/api";
import { bridgePull } from "@/lib/db/repository";
import { env } from "@/lib/env";
import { verifySignedRequest } from "@/lib/streamerbot/security";

export async function POST(request: Request) {
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
  return ok(await bridgePull());
}
