import { describe, expect, it } from "vitest";

import {
  buildThemeCookie,
  getThemeCookieValue,
  resolveThemePreference,
} from "@/lib/theme";

describe("resolveThemePreference", () => {
  it("keeps a valid stored theme", () => {
    expect(resolveThemePreference("dark", false)).toBe("dark");
    expect(resolveThemePreference("light", true)).toBe("light");
  });

  it("falls back to system preference when storage is invalid", () => {
    expect(resolveThemePreference("system", true)).toBe("dark");
    expect(resolveThemePreference(null, false)).toBe("light");
  });
});

describe("theme cookies", () => {
  it("extracts the persisted theme from the cookie header", () => {
    const cookie = buildThemeCookie("dark");

    expect(getThemeCookieValue(`foo=bar; ${cookie}`)).toBe("dark");
  });

  it("ignores invalid theme cookies", () => {
    expect(getThemeCookieValue("pipetz-theme=sepia")).toBeNull();
  });
});
