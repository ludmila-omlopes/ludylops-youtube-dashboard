import { fail, ok, requireApiSession } from "@/lib/api";
import { getViewerDashboard } from "@/lib/db/repository";

export async function GET() {
  const session = await requireApiSession();
  if (!session?.user?.email) {
    return fail("Unauthorized", 401);
  }
  return ok(await getViewerDashboard(session.user.email));
}
