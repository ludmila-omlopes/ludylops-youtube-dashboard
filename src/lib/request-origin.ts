export function isTrustedAppMutationRequest(
  request: Pick<Request, "url" | "headers">,
) {
  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");
  const source = originHeader ?? refererHeader;

  if (!source) {
    return false;
  }

  let targetOrigin: string;
  try {
    targetOrigin = new URL(request.url).origin;
  } catch {
    return false;
  }

  try {
    return new URL(source).origin === targetOrigin;
  } catch {
    return false;
  }
}
