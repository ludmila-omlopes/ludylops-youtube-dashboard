import { fail, ok } from "@/lib/api";
import { getViewerByYoutubeChannelId } from "@/lib/db/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ youtubeChannelId: string }> },
) {
  const { youtubeChannelId } = await params;
  const viewer = await getViewerByYoutubeChannelId(youtubeChannelId);
  if (!viewer) {
    return fail("Viewer não encontrado.", 404);
  }
  return ok(viewer);
}
