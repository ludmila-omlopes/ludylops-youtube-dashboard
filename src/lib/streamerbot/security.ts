import crypto from "node:crypto";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function buildSignature({
  body,
  timestamp,
  secret,
}: {
  body: string;
  timestamp: string;
  secret: string;
}) {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

export function verifySignedRequest({
  body,
  timestamp,
  signature,
  secret,
  now = Date.now(),
}: {
  body: string;
  timestamp: string | null;
  signature: string | null;
  secret: string | undefined;
  now?: number;
}) {
  if (!secret || !timestamp || !signature) {
    return false;
  }

  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed)) {
    return false;
  }

  if (Math.abs(now - parsed) > FIVE_MINUTES_MS) {
    return false;
  }

  const expected = buildSignature({ body, timestamp, secret });
  const received = Buffer.from(signature);
  const computed = Buffer.from(expected);

  if (received.length !== computed.length) {
    return false;
  }

  return crypto.timingSafeEqual(received, computed);
}
