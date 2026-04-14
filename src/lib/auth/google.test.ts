import { describe, expect, it } from "vitest";

import {
  GOOGLE_ACCOUNT_SWITCH_HINT,
  GOOGLE_AUTHORIZATION_PARAMS,
  GOOGLE_REAUTHORIZATION_PARAMS,
  GOOGLE_REQUIRED_SCOPES,
  GOOGLE_SECURE_OAUTH_CHECKS,
} from "@/lib/auth/google";

describe("GOOGLE_AUTHORIZATION_PARAMS", () => {
  it("always asks Google to show the account chooser", () => {
    expect(GOOGLE_AUTHORIZATION_PARAMS.prompt).toBe("select_account");
    expect(GOOGLE_AUTHORIZATION_PARAMS.response_type).toBe("code");
    expect(GOOGLE_AUTHORIZATION_PARAMS.include_granted_scopes).toBe("true");
  });

  it("uses an explicit consent prompt when reauthorization is needed", () => {
    expect(GOOGLE_REAUTHORIZATION_PARAMS.prompt).toBe("consent select_account");
    expect(GOOGLE_REAUTHORIZATION_PARAMS.scope).toBe(GOOGLE_REQUIRED_SCOPES.join(" "));
  });

  it("keeps the scopes needed for profile and YouTube linking", () => {
    expect(GOOGLE_REQUIRED_SCOPES).toEqual([
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/youtube.readonly",
    ]);
    expect(GOOGLE_AUTHORIZATION_PARAMS.scope).toBe(GOOGLE_REQUIRED_SCOPES.join(" "));
  });

  it("documents the account-switching hint shown on the homepage", () => {
    expect(GOOGLE_ACCOUNT_SWITCH_HINT).toContain("escolher outra conta");
    expect(GOOGLE_ACCOUNT_SWITCH_HINT).toContain("sem limpar a sessao");
  });

  it("keeps the secure OAuth checks explicit for Google sign-in", () => {
    expect(GOOGLE_SECURE_OAUTH_CHECKS).toEqual(["pkce", "state"]);
  });
});
