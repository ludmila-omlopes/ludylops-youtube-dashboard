import { describe, expect, it } from "vitest";

import { isTrustedAppMutationRequest } from "@/lib/request-origin";

describe("isTrustedAppMutationRequest", () => {
  it("accepts matching origin headers", () => {
    const request = new Request("https://ludylops.live/api/me/redeem", {
      method: "POST",
      headers: {
        origin: "https://ludylops.live",
      },
    });

    expect(isTrustedAppMutationRequest(request)).toBe(true);
  });

  it("accepts matching referer when origin is absent", () => {
    const request = new Request("https://ludylops.live/api/me/redeem", {
      method: "POST",
      headers: {
        referer: "https://ludylops.live/me",
      },
    });

    expect(isTrustedAppMutationRequest(request)).toBe(true);
  });

  it("rejects cross-site origins", () => {
    const request = new Request("https://ludylops.live/api/me/redeem", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
      },
    });

    expect(isTrustedAppMutationRequest(request)).toBe(false);
  });

  it("rejects requests without origin metadata", () => {
    const request = new Request("https://ludylops.live/api/me/redeem", {
      method: "POST",
    });

    expect(isTrustedAppMutationRequest(request)).toBe(false);
  });
});
