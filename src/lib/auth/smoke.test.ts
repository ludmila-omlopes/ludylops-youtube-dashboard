import { describe, expect, it } from "vitest";

import {
  isHealthySignInStartResponse,
  pickAuthSmokeProvider,
  runAuthSmokeTest,
} from "@/lib/auth/smoke";

function createResponse(input: {
  status: number;
  body?: unknown;
  headers?: HeadersInit;
}) {
  return new Response(
    input.body === undefined ? null : JSON.stringify(input.body),
    {
      status: input.status,
      headers: input.headers,
    },
  );
}

describe("pickAuthSmokeProvider", () => {
  it("prefers google when it is available", () => {
    expect(pickAuthSmokeProvider(["credentials", "google"])).toBe("google");
  });

  it("falls back to credentials when google is absent", () => {
    expect(pickAuthSmokeProvider(["credentials"])).toBe("credentials");
  });
});

describe("isHealthySignInStartResponse", () => {
  it("accepts a redirecting OAuth provider response", () => {
    const response = createResponse({
      status: 302,
      headers: {
        location: "https://accounts.google.com/o/oauth2/v2/auth",
      },
    });

    expect(isHealthySignInStartResponse("google", response)).toBe(true);
  });

  it("accepts a non-redirecting credentials response", () => {
    const response = createResponse({
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });

    expect(isHealthySignInStartResponse("credentials", response)).toBe(true);
  });
});

describe("runAuthSmokeTest", () => {
  it("checks providers and the preferred sign-in start path", async () => {
    const calls: string[] = [];
    const fetchFn = async (url: string) => {
      calls.push(url);
      if (url.endsWith("/api/auth/providers")) {
        return createResponse({
          status: 200,
          body: {
            google: { id: "google", name: "Google" },
            credentials: { id: "credentials", name: "Demo" },
          },
          headers: {
            "content-type": "application/json",
          },
        });
      }

      return createResponse({
        status: 302,
        headers: {
          location: "https://accounts.google.com/o/oauth2/v2/auth",
        },
      });
    };

    const result = await runAuthSmokeTest({
      baseUrl: "https://ludylops.live/",
      fetchFn,
    });

    expect(calls).toEqual([
      "https://ludylops.live/api/auth/providers",
      "https://ludylops.live/api/auth/signin/google?callbackUrl=%2F",
    ]);
    expect(result.selectedProviderId).toBe("google");
    expect(result.signInStatus).toBe(302);
  });

  it("fails when no providers are configured", async () => {
    const fetchFn = async () =>
      createResponse({
        status: 200,
        body: {},
        headers: {
          "content-type": "application/json",
        },
      });

    await expect(
      runAuthSmokeTest({
        baseUrl: "https://ludylops.live",
        fetchFn,
      }),
    ).rejects.toThrow("no configured providers");
  });
});
