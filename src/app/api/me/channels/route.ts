import { fail, isTrustedAppMutationRequest, ok, requireApiSession } from "@/lib/api";
import {
  getSessionViewerState,
  listViewerChannelsForGoogleAccount,
  setActiveViewerForGoogleAccount,
} from "@/lib/db/repository";
import { setActiveViewerSchema } from "@/lib/streamerbot/schemas";

export async function GET() {
  const session = await requireApiSession();
  if (!session?.user?.email || !session.user.googleAccountId) {
    return fail("Unauthorized", 401);
  }

  const [state, channels] = await Promise.all([
    getSessionViewerState({
      googleUserId: null,
      email: session.user.email,
    }),
    listViewerChannelsForGoogleAccount(session.user.googleAccountId),
  ]);

  return ok({
    googleAccountId: session.user.googleAccountId,
    activeViewerId: state?.activeViewer.id ?? session.user.activeViewerId ?? null,
    channels,
  });
}

export async function POST(request: Request) {
  if (!isTrustedAppMutationRequest(request)) {
    return fail("Forbidden", 403);
  }

  const session = await requireApiSession();
  if (!session?.user?.googleAccountId) {
    return fail("Unauthorized", 401);
  }

  const payload = setActiveViewerSchema.parse(await request.json());
  const viewer = await setActiveViewerForGoogleAccount(session.user.googleAccountId, payload.viewerId);
  if (!viewer) {
    return fail("Viewer not found.", 404);
  }

  const channels = await listViewerChannelsForGoogleAccount(session.user.googleAccountId);
  return ok({
    activeViewerId: viewer.id,
    channels,
  });
}
