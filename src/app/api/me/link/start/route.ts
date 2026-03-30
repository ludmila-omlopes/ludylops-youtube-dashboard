import { fail, ok, requireApiSession } from "@/lib/api";
import { startLinkCode } from "@/lib/db/repository";

export async function POST() {
  const session = await requireApiSession();
  if (!session?.user?.email) {
    return fail("Unauthorized", 401);
  }
  const code = await startLinkCode(session.user.email);
  return ok(code);
}
