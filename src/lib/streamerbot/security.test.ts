import { buildSignature, verifySignedRequest } from "@/lib/streamerbot/security";

describe("verifySignedRequest", () => {
  it("accepts a valid HMAC within the replay window", () => {
    const body = JSON.stringify({ hello: "world" });
    const timestamp = `${Date.now()}`;
    const signature = buildSignature({
      body,
      timestamp,
      secret: "super-secret",
    });

    expect(
      verifySignedRequest({
        body,
        timestamp,
        signature,
        secret: "super-secret",
      }),
    ).toBe(true);
  });

  it("rejects a stale timestamp", () => {
    const body = "{}";
    const timestamp = `${Date.now() - 10 * 60 * 1000}`;
    const signature = buildSignature({
      body,
      timestamp,
      secret: "super-secret",
    });

    expect(
      verifySignedRequest({
        body,
        timestamp,
        signature,
        secret: "super-secret",
      }),
    ).toBe(false);
  });
});
