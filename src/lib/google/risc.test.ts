import { createSign, generateKeyPairSync } from "node:crypto";

import { describe, expect, it } from "vitest";

import { GOOGLE_RISC_EVENT_TYPES, listGoogleRiscEvents, validateGoogleRiscToken } from "@/lib/google/risc";

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signJwt(input: {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  privateKey: string;
}) {
  const encodedHeader = encodeBase64Url(JSON.stringify(input.header));
  const encodedPayload = encodeBase64Url(JSON.stringify(input.payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(input.privateKey);
  return `${signingInput}.${encodeBase64Url(signature)}`;
}

describe("validateGoogleRiscToken", () => {
  it("accepts a valid Google RISC token with a matching audience", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const token = signJwt({
      header: {
        alg: "RS256",
        typ: "JWT",
        kid: "test-key",
      },
      payload: {
        iss: "https://accounts.google.com/",
        aud: "client-123.apps.googleusercontent.com",
        iat: 1_776_176_400,
        jti: "evt-123",
        events: {
          [GOOGLE_RISC_EVENT_TYPES.accountDisabled]: {
            subject: {
              subject_type: "iss-sub",
              iss: "https://accounts.google.com/",
              sub: "google-user-123",
            },
            reason: "hijacking",
          },
        },
      },
      privateKey: privateKey.export({ format: "pem", type: "pkcs1" }).toString(),
    });

    const validated = await validateGoogleRiscToken(token, {
      audiences: ["client-123.apps.googleusercontent.com"],
      fetchImpl: (async (url: string) => {
        if (url.endsWith("/.well-known/risc-configuration")) {
          return new Response(
            JSON.stringify({
              issuer: "https://accounts.google.com/",
              jwks_uri: "https://example.test/jwks",
            }),
            { status: 200 },
          );
        }

        return new Response(
          JSON.stringify({
            keys: [
              {
                ...(publicKey.export({ format: "jwk" }) as JsonWebKey),
                alg: "RS256",
                kid: "test-key",
                use: "sig",
              },
            ],
          }),
          { status: 200 },
        );
      }) as typeof fetch,
    });

    expect(validated.payload.jti).toBe("evt-123");

    const events = listGoogleRiscEvents(validated.payload);
    expect(events).toEqual([
      expect.objectContaining({
        eventType: GOOGLE_RISC_EVENT_TYPES.accountDisabled,
        googleUserId: "google-user-123",
        reason: "hijacking",
      }),
    ]);
  });

  it("rejects a token when the audience does not match the configured OAuth clients", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const token = signJwt({
      header: {
        alg: "RS256",
        typ: "JWT",
        kid: "test-key",
      },
      payload: {
        iss: "https://accounts.google.com/",
        aud: "another-client.apps.googleusercontent.com",
        iat: 1_776_176_400,
        jti: "evt-456",
        events: {},
      },
      privateKey: privateKey.export({ format: "pem", type: "pkcs1" }).toString(),
    });

    await expect(
      validateGoogleRiscToken(token, {
        audiences: ["client-123.apps.googleusercontent.com"],
        fetchImpl: (async (url: string) => {
          if (url.endsWith("/.well-known/risc-configuration")) {
            return new Response(
              JSON.stringify({
                issuer: "https://accounts.google.com/",
                jwks_uri: "https://example.test/jwks",
              }),
              { status: 200 },
            );
          }

          return new Response(
            JSON.stringify({
              keys: [
                {
                  ...(publicKey.export({ format: "jwk" }) as JsonWebKey),
                  alg: "RS256",
                  kid: "test-key",
                  use: "sig",
                },
              ],
            }),
            { status: 200 },
          );
        }) as typeof fetch,
      }),
    ).rejects.toThrow("audience");
  });
});
