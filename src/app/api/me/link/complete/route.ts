import { fail, ok, requireApiSession } from "@/lib/api";
import { getLinkStatus } from "@/lib/db/repository";

export async function POST() {
  const session = await requireApiSession();
  if (!session?.user?.email) {
    return fail("Unauthorized", 401);
  }
  return ok(await getLinkStatus(session.user.email));
}
