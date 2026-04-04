const YOUTUBE_HANDLE_URL_PREFIX = /^(?:https?:\/\/)?(?:www\.)?youtube\.com\//iu;
const YOUTUBE_HANDLE_BODY_PATTERN = /^[\p{L}\p{N}](?:[\p{L}\p{N}._\-\u00B7]{0,28}[\p{L}\p{N}])?$/u;

function normalizeIdentityToken(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/^@/u, "").toLocaleLowerCase();
}

function extractYoutubeHandleBody(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  const withoutUrlPrefix = trimmed.replace(YOUTUBE_HANDLE_URL_PREFIX, "");
  const withoutAt = withoutUrlPrefix.replace(/^@/u, "");
  if (!withoutAt || /\s/u.test(withoutAt) || withoutAt.includes("/")) {
    return null;
  }

  if (!YOUTUBE_HANDLE_BODY_PATTERN.test(withoutAt)) {
    return null;
  }

  return withoutAt;
}

export function normalizeYoutubeHandle(value: string | null | undefined) {
  const handleBody = extractYoutubeHandleBody(value);
  return handleBody ? `@${handleBody}` : null;
}

export function isYoutubeHandleRedundant(input: {
  youtubeDisplayName?: string | null;
  youtubeHandle?: string | null;
}) {
  const normalizedHandle = normalizeIdentityToken(normalizeYoutubeHandle(input.youtubeHandle));
  const normalizedDisplayName = normalizeIdentityToken(input.youtubeDisplayName);

  if (!normalizedHandle || !normalizedDisplayName) {
    return false;
  }

  return normalizedHandle === normalizedDisplayName;
}

export function getDistinctYoutubeHandle(input: {
  youtubeDisplayName?: string | null;
  youtubeHandle?: string | null;
}) {
  const normalizedHandle = normalizeYoutubeHandle(input.youtubeHandle);
  if (!normalizedHandle) {
    return null;
  }

  return isYoutubeHandleRedundant(input) ? null : normalizedHandle;
}
