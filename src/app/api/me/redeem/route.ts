import { fail, ok, requireApiSession } from "@/lib/api";
import { redeemItem } from "@/lib/db/repository";
import { redeemSchema } from "@/lib/streamerbot/schemas";

export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session?.user?.email) {
    return fail("Unauthorized", 401);
  }

  const json = await request.json();
  const payload = redeemSchema.parse(json);

  try {
    const redemption = await redeemItem({
      email: session.user.email,
      itemId: payload.itemId,
      source: payload.source,
    });
    return ok(redemption, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao resgatar.";
    return fail(message, 400);
  }
}
