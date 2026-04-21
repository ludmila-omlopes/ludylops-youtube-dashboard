import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/client", () => ({
  getDb: getDbMock,
}));

describe("active death counter game config", () => {
  beforeEach(() => {
    vi.resetModules();
    getDbMock.mockReset();
    getDbMock.mockReturnValue(null);
    delete (globalThis as typeof globalThis & {
      __lojaActiveDeathCounterGame?: unknown;
    }).__lojaActiveDeathCounterGame;
  });

  it("stores and clears the active game in demo mode", async () => {
    const module = await import("@/lib/streamerbot/death-counter-game");

    const saved = await module.setActiveDeathCounterGame({
      gameName: "Hollow Knight: Silksong",
      updatedBy: "admin@example.com",
    });

    expect(saved).toMatchObject({
      scopeType: "game",
      scopeKey: "hollow-knight-silksong",
      scopeLabel: "Hollow Knight: Silksong",
      updatedBy: "admin@example.com",
    });

    await expect(module.getActiveDeathCounterGame()).resolves.toMatchObject({
      scopeKey: "hollow-knight-silksong",
      scopeLabel: "Hollow Knight: Silksong",
    });

    await expect(module.clearActiveDeathCounterGame()).resolves.toBeNull();
    await expect(module.getActiveDeathCounterGame()).resolves.toBeNull();
  });

  it("reads the active game from streamerbot_counters in database mode", async () => {
    getDbMock.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                updatedAt: new Date("2026-04-21T20:00:00.000Z"),
                metadata: {
                  scopeType: "game",
                  scopeKey: "silksong",
                  scopeLabel: "Silksong",
                  updatedBy: "admin@example.com",
                },
              },
            ],
          }),
        }),
      }),
    });

    const module = await import("@/lib/streamerbot/death-counter-game");

    await expect(module.getActiveDeathCounterGame()).resolves.toEqual({
      scopeType: "game",
      scopeKey: "silksong",
      scopeLabel: "Silksong",
      updatedAt: "2026-04-21T20:00:00.000Z",
      updatedBy: "admin@example.com",
    });
  });
});
