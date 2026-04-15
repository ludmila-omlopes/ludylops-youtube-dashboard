import { fail, ok, requireApiSession } from "@/lib/api";
import { getViewerLinkCodeState, issueViewerLinkCode } from "@/lib/db/repository";

export async function GET() {
  const session = await requireApiSession();
  if (!session?.user?.googleAccountId) {
    return fail("Unauthorized", 401);
  }

  const link = await getViewerLinkCodeState(session.user.googleAccountId);
  return ok({
    link,
  });
}

export async function POST() {
  const session = await requireApiSession();
  if (!session?.user?.googleAccountId) {
    return fail("Unauthorized", 401);
  }

  const link = await issueViewerLinkCode(session.user.googleAccountId);
  return ok({
    link,
  });
}
