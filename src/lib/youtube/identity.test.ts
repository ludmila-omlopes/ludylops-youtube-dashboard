import { describe, expect, it } from "vitest";

import {
  getDistinctYoutubeHandle,
  isYoutubeHandleRedundant,
  normalizeYoutubeHandle,
} from "@/lib/youtube/identity";

describe("normalizeYoutubeHandle", () => {
  it("normalizes handles with or without the @ prefix", () => {
    expect(normalizeYoutubeHandle("viewer_name")).toBe("@viewer_name");
    expect(normalizeYoutubeHandle("@viewer_name")).toBe("@viewer_name");
  });

  it("accepts a YouTube handle URL and extracts the handle", () => {
    expect(normalizeYoutubeHandle("https://www.youtube.com/@viewer.name")).toBe("@viewer.name");
  });

  it("rejects values that cannot be valid YouTube handles", () => {
    expect(normalizeYoutubeHandle("Viewer Name")).toBeNull();
    expect(normalizeYoutubeHandle("https://www.youtube.com/channel/UC123")).toBeNull();
    expect(normalizeYoutubeHandle("")).toBeNull();
  });
});

describe("isYoutubeHandleRedundant", () => {
  it("detects when the handle only repeats the display name", () => {
    expect(
      isYoutubeHandleRedundant({
        youtubeDisplayName: "brenoolg",
        youtubeHandle: "@brenoolg",
      }),
    ).toBe(true);
  });

  it("keeps distinct handle and display name pairs", () => {
    expect(
      isYoutubeHandleRedundant({
        youtubeDisplayName: "Ludmila Lopes",
        youtubeHandle: "@ludylops",
      }),
    ).toBe(false);
  });
});

describe("getDistinctYoutubeHandle", () => {
  it("hides duplicated handles from UI consumers", () => {
    expect(
      getDistinctYoutubeHandle({
        youtubeDisplayName: "StrikeTPS",
        youtubeHandle: "@StrikeTPS",
      }),
    ).toBeNull();
  });

  it("returns a normalized handle when it adds new identity information", () => {
    expect(
      getDistinctYoutubeHandle({
        youtubeDisplayName: "Ludmila Lopes",
        youtubeHandle: "ludylops",
      }),
    ).toBe("@ludylops");
  });
});
