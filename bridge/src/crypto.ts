import { createHmac, timingSafeEqual } from "node:crypto";

export function signRequest(input: {
  timestamp: string;
  body: string;
  secret: string;
}) {
  const payload = `${input.timestamp}.${input.body}`;

  return createHmac("sha256", input.secret).update(payload).digest("hex");
}

export function verifySignature(input: {
  timestamp: string;
  body: string;
  secret: string;
  signature: string;
}) {
  const expected = signRequest(input);
  return timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
}
