import {
  createPrivateKey,
  createPublicKey,
  createSign,
  createVerify,
  type JsonWebKey as NodeJsonWebKey,
} from "node:crypto";

import { env } from "@/lib/env";

export const GOOGLE_RISC_DISCOVERY_URL = "https://accounts.google.com/.well-known/risc-configuration";
export const GOOGLE_RISC_MANAGEMENT_AUDIENCE =
  "https://risc.googleapis.com/google.identity.risc.v1beta.RiscManagementService";
export const GOOGLE_RISC_STREAM_URL = "https://risc.googleapis.com/v1beta/stream";
export const GOOGLE_RISC_STREAM_UPDATE_URL = "https://risc.googleapis.com/v1beta/stream:update";
export const GOOGLE_RISC_STREAM_VERIFY_URL = "https://risc.googleapis.com/v1beta/stream:verify";
export const GOOGLE_RISC_STREAM_STATUS_UPDATE_URL = "https://risc.googleapis.com/v1beta/stream/status:update";
export const GOOGLE_RISC_DELIVERY_METHOD_PUSH =
  "https://schemas.openid.net/secevent/risc/delivery-method/push";
export const GOOGLE_RISC_RECEIVER_PATH = "/api/internal/google/cross-account-protection";

export const GOOGLE_RISC_EVENT_TYPES = {
  sessionsRevoked: "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
  tokensRevoked: "https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked",
  tokenRevoked: "https://schemas.openid.net/secevent/oauth/event-type/token-revoked",
  accountDisabled: "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
  accountEnabled: "https://schemas.openid.net/secevent/risc/event-type/account-enabled",
  accountCredentialChangeRequired:
    "https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required",
  verification: "https://schemas.openid.net/secevent/risc/event-type/verification",
} as const;

export const GOOGLE_RISC_DEFAULT_EVENT_TYPES = Object.values(GOOGLE_RISC_EVENT_TYPES);

type GoogleRiscJwk = JsonWebKey & {
  alg?: string;
  e?: string;
  kid?: string;
  kty?: string;
  n?: string;
  use?: string;
};

export type GoogleRiscDiscoveryDocument = {
  issuer: string;
  jwks_uri: string;
};

type GoogleRiscJwksDocument = {
  keys: GoogleRiscJwk[];
};

export type GoogleRiscSecurityEventSubject = {
  subject_type?: string;
  iss?: string;
  sub?: string;
  email?: string;
  token_type?: string;
  token_identifier_alg?: string;
  token?: string;
};

export type GoogleRiscSecurityEvent = {
  subject?: GoogleRiscSecurityEventSubject;
  reason?: string;
  state?: string;
  [key: string]: unknown;
};

export type GoogleRiscSecurityEventTokenPayload = {
  iss: string;
  aud: string | string[];
  iat?: number;
  jti?: string;
  events?: Record<string, GoogleRiscSecurityEvent>;
  [key: string]: unknown;
};

type DecodedJwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
  [key: string]: unknown;
};

type JwtParts = {
  encodedPayload: string;
  header: DecodedJwtHeader;
  signature: Buffer;
  signingInput: string;
};

type DecodedJwt<TPayload> = {
  header: { alg?: string; kid?: string; typ?: string; [key: string]: unknown };
  payload: TPayload;
  signingInput: string;
  signature: Buffer;
};

export type ValidatedGoogleRiscToken = {
  discovery: GoogleRiscDiscoveryDocument;
  header: DecodedJwt<GoogleRiscSecurityEventTokenPayload>["header"];
  payload: GoogleRiscSecurityEventTokenPayload;
};

type FetchLike = typeof fetch;

function base64UrlToBuffer(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4 || 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function splitJwt(token: string): JwtParts {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed JWT received from Google RISC.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = JSON.parse(base64UrlToBuffer(encodedHeader).toString("utf8")) as DecodedJwtHeader;

  return {
    header,
    encodedPayload,
    signingInput: `${encodedHeader}.${encodedPayload}`,
    signature: base64UrlToBuffer(encodedSignature),
  };
}

function decodeJwtPayload<TPayload>(encodedPayload: string) {
  return JSON.parse(base64UrlToBuffer(encodedPayload).toString("utf8")) as TPayload;
}

export function getGoogleRiscReceiverUrl(baseUrl?: string | null) {
  const resolvedBaseUrl = baseUrl ?? env.GOOGLE_RISC_RECEIVER_URL ?? env.APP_URL ?? env.NEXT_PUBLIC_APP_URL;
  if (!resolvedBaseUrl) {
    return null;
  }

  if (resolvedBaseUrl.endsWith(GOOGLE_RISC_RECEIVER_PATH)) {
    return resolvedBaseUrl;
  }

  return new URL(GOOGLE_RISC_RECEIVER_PATH, resolvedBaseUrl).toString();
}

export function getGoogleRiscAllowedAudiences() {
  const audiences = [env.AUTH_GOOGLE_ID, ...(env.GOOGLE_RISC_ALLOWED_AUDIENCES ?? "").split(",")]
    .map((entry) => entry?.trim())
    .filter((entry): entry is string => Boolean(entry));
  return [...new Set(audiences)];
}

async function fetchJson<T>(url: string, fetchImpl: FetchLike) {
  const response = await fetchImpl(url, {
    headers: {
      accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

function verifyGoogleJwtSignature(
  decoded: JwtParts,
  jwks: GoogleRiscJwksDocument,
) {
  const keyId = decoded.header.kid;
  if (!keyId) {
    throw new Error("Google RISC token is missing a key identifier.");
  }

  const jwk = jwks.keys.find((entry) => entry.kid === keyId);
  if (!jwk) {
    throw new Error(`Google RISC signing key ${keyId} was not found in JWKS.`);
  }

  const publicKey = createPublicKey({
    key: jwk as NodeJsonWebKey,
    format: "jwk",
  });
  const verifier = createVerify("RSA-SHA256");
  verifier.update(decoded.signingInput);
  verifier.end();

  if (!verifier.verify(publicKey, decoded.signature)) {
    throw new Error("Google RISC token signature validation failed.");
  }
}

function validateGoogleRiscClaims(
  payload: GoogleRiscSecurityEventTokenPayload,
  discovery: GoogleRiscDiscoveryDocument,
  audiences: string[],
) {
  if (payload.iss !== discovery.issuer) {
    throw new Error(`Unexpected Google RISC issuer: ${payload.iss}`);
  }

  const tokenAudiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!tokenAudiences.some((entry) => audiences.includes(entry))) {
    throw new Error("Google RISC token audience does not match any configured OAuth client ID.");
  }
}

export async function validateGoogleRiscToken(
  token: string,
  input: {
    audiences?: string[];
    fetchImpl?: FetchLike;
  } = {},
): Promise<ValidatedGoogleRiscToken> {
  const audiences = input.audiences ?? getGoogleRiscAllowedAudiences();
  if (audiences.length === 0) {
    throw new Error("No Google OAuth client IDs configured for Cross-Account Protection.");
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const jwtParts = splitJwt(token);
  const discovery = await fetchJson<GoogleRiscDiscoveryDocument>(GOOGLE_RISC_DISCOVERY_URL, fetchImpl);
  const jwks = await fetchJson<GoogleRiscJwksDocument>(discovery.jwks_uri, fetchImpl);

  verifyGoogleJwtSignature(jwtParts, jwks);
  const payload = decodeJwtPayload<GoogleRiscSecurityEventTokenPayload>(jwtParts.encodedPayload);
  validateGoogleRiscClaims(payload, discovery, audiences);

  return {
    discovery,
    header: jwtParts.header,
    payload,
  };
}

export function listGoogleRiscEvents(payload: GoogleRiscSecurityEventTokenPayload) {
  return Object.entries(payload.events ?? {}).map(([eventType, event]) => ({
    eventType,
    event,
    googleUserId: typeof event.subject?.sub === "string" ? event.subject.sub : null,
    reason: typeof event.reason === "string" ? event.reason : null,
    state: typeof event.state === "string" ? event.state : null,
  }));
}

export function summarizeGoogleRiscToken(payload: GoogleRiscSecurityEventTokenPayload) {
  return {
    jti: payload.jti ?? null,
    iss: payload.iss,
    aud: payload.aud,
    eventTypes: listGoogleRiscEvents(payload).map((entry) => entry.eventType),
    subjects: listGoogleRiscEvents(payload).map((entry) =>
      entry.googleUserId ? `${entry.googleUserId.slice(0, 6)}...${entry.googleUserId.slice(-4)}` : "unknown",
    ),
  };
}

export function signServiceAccountJwt(input: {
  audience: string;
  clientEmail: string;
  keyId: string;
  privateKey: string;
  issuedAt?: number;
  expiresAt?: number;
}) {
  const issuedAt = input.issuedAt ?? Math.floor(Date.now() / 1000);
  const expiresAt = input.expiresAt ?? issuedAt + 3600;
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: input.keyId,
  };
  const payload = {
    iss: input.clientEmail,
    sub: input.clientEmail,
    aud: input.audience,
    iat: issuedAt,
    exp: expiresAt,
  };
  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();

  const privateKey = createPrivateKey(input.privateKey);
  const signature = signer.sign(privateKey);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}
