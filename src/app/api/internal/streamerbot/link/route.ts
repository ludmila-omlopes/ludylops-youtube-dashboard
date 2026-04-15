import { env } from "@/lib/env";
import { fail, ok } from "@/lib/api";
import { claimViewerLinkCodeFromStreamerbot } from "@/lib/db/repository";
import { streamerbotViewerLinkSchema } from "@/lib/streamerbot/schemas";
import { verifySignedRequest } from "@/lib/streamerbot/security";

function buildReplyMessage(input: { displayName?: string; mergedSyntheticViewer: boolean }) {
  const prefix = input.displayName ? `${input.displayName}, ` : "";

  if (input.mergedSyntheticViewer) {
    return `${prefix}conta vinculada com sucesso. Mantive seu saldo e historico da loja neste canal.`;
  }

  return `${prefix}conta vinculada com sucesso.`;
}

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
    return fail("Invalid signature.", 401);
  }

  try {
    const payload = streamerbotViewerLinkSchema.parse(JSON.parse(raw));
    const result = await claimViewerLinkCodeFromStreamerbot({
      linkCode: payload.linkCode,
      viewerExternalId: payload.viewerExternalId,
      youtubeDisplayName: payload.youtubeDisplayName,
      youtubeHandle: payload.youtubeHandle,
    });

    return ok({
      viewerId: result.viewer.id,
      googleAccountId: result.googleAccountId,
      mergedSyntheticViewer: result.mergedSyntheticViewer,
      replyMessage: buildReplyMessage({
        displayName: payload.youtubeDisplayName,
        mergedSyntheticViewer: result.mergedSyntheticViewer,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "viewer_link_failed";
    const status =
      message === "viewer_link_code_invalid"
        ? 404
        : message === "viewer_owned_by_other_account"
          ? 409
          : 400;

    return fail(message, status);
  }
}
