import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.hoisted(() => vi.fn());
const isStreamerbotLivestreamActiveMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/client", () => ({
  getDb: getDbMock,
}));

vi.mock("@/lib/env", () => ({
  isDemoMode: false,
  adminEmails: new Set(["admin@example.com"]),
}));

vi.mock("@/lib/streamerbot/live-status", () => ({
  eventRequiresActiveLivestream: (eventType: string) =>
    eventType === "presence_tick" || eventType === "chat_bonus",
  isStreamerbotLivestreamActive: isStreamerbotLivestreamActiveMock,
}));

import { demoBetRecords } from "@/lib/demo-data";
import {
  betEntries,
  betOptions,
  bets,
  pointLedger,
  redemptions,
  streamerbotEventLog,
  users,
  viewerBalances,
} from "@/lib/db/schema";
import {
  boostGameSuggestion,
  cancelBet,
  createBet,
  createGameSuggestion,
  createProductRecommendationFromInput,
  deleteProductRecommendation,
  ensureViewerFromSession,
  getViewerDashboard,
  getSessionViewerState,
  ingestStreamerbotEvent,
  listAdminProductRecommendations,
  listBets,
  listGameSuggestions,
  listAdminGameSuggestions,
  listViewerChannelsForGoogleAccount,
  lockBet,
  placeBet,
  placeBetFromChatCommand,
  resolveBet,
  setActiveViewerForGoogleAccount,
  updateGameSuggestionStatus,
} from "@/lib/db/repository";

function createDb({
  usersRows = [],
  betRows = [],
  optionRows = [],
  entryRows = [],
  betsError,
  optionsError,
  entriesError,
}: {
  usersRows?: Array<{
    id: string;
    googleUserId: string | null;
    email: string | null;
    youtubeChannelId: string;
    youtubeDisplayName: string;
    youtubeHandle?: string | null;
    avatarUrl: string | null;
    isLinked: boolean;
    excludeFromRanking: boolean;
    createdAt: Date;
  }>;
  betRows?: unknown[];
  optionRows?: unknown[];
  entryRows?: unknown[];
  betsError?: Error;
  optionsError?: Error;
  entriesError?: Error;
}) {
  return {
    select() {
      return {
        from(table: unknown) {
          if (table === users) {
            return {
              where() {
                return {
                  limit: async () => usersRows,
                };
              },
            };
          }

          if (table === bets) {
            return {
              orderBy: async () => {
                if (betsError) {
                  throw betsError;
                }
                return betRows;
              },
            };
          }

          if (table === betOptions) {
            if (optionsError) {
              return Promise.reject(optionsError);
            }
            return Promise.resolve(optionRows);
          }

          if (table === betEntries) {
            return {
              where: async () => {
                if (entriesError) {
                  throw entriesError;
                }
                return entryRows;
              },
            };
          }

          throw new Error("Unexpected table in test db stub.");
        },
      };
    },
  };
}

function createPlaceBetDb(options?: {
  amount?: number;
  currentBalance?: number;
  insertConflict?: boolean;
  balanceDebitSucceeds?: boolean;
}) {
  const amount = options?.amount ?? 50;
  const currentBalance = options?.currentBalance ?? 100;
  const insertConflict = options?.insertConflict ?? false;
  const balanceDebitSucceeds = options?.balanceDebitSucceeds ?? true;

  const viewerRow = {
    id: "viewer-db-1",
    googleUserId: "google-db-1",
    email: "viewer@example.com",
    youtubeChannelId: "yt_db_1",
    youtubeDisplayName: "Viewer DB",
    youtubeHandle: "@viewerdb",
    avatarUrl: null,
    isLinked: true,
    excludeFromRanking: false,
    createdAt: new Date("2026-03-31T10:00:00.000Z"),
  };

  const balanceRow = {
    viewerId: viewerRow.id,
    currentBalance,
    lifetimeEarned: 200,
    lifetimeSpent: 30,
    lastSyncedAt: new Date("2026-03-31T10:00:00.000Z"),
  };
  const now = Date.now();

  const betRow = {
    id: "bet-db-1",
    question: "Vai passar sem hit?",
    status: "open",
    openedAt: new Date(now - 5 * 60 * 1000),
    closesAt: new Date(now + 60 * 60 * 1000),
    lockedAt: null,
    resolvedAt: null,
    cancelledAt: null,
    winningOptionId: null,
    createdAt: new Date(now - 10 * 60 * 1000),
  };

  const optionRows = [
    {
      id: "bet-opt-1",
      betId: betRow.id,
      label: "Sim",
      sortOrder: 0,
      poolAmount: 100,
    },
    {
      id: "bet-opt-2",
      betId: betRow.id,
      label: "Nao",
      sortOrder: 1,
      poolAmount: 200,
    },
  ];

  const insertedBetEntries: unknown[] = [];
  const insertedLedger: unknown[] = [];

  const tx = {
    select() {
      return {
        from(table: unknown) {
          if (table === bets) {
            return {
              where() {
                return {
                  limit: async () => [betRow],
                };
              },
            };
          }

          if (table === betOptions) {
            return {
              where() {
                return {
                  limit: async () => [optionRows[0]],
                };
              },
            };
          }

          throw new Error("Unexpected table in placeBet tx stub.");
        },
      };
    },
    insert(table: unknown) {
      if (table === betEntries) {
        return {
          values(value: unknown) {
            return {
              onConflictDoNothing() {
                return {
                  returning: async () => {
                    if (insertConflict) {
                      return [];
                    }
                    insertedBetEntries.push(value);
                    return [{ id: "inserted-bet-entry" }];
                  },
                };
              },
            };
          },
        };
      }

      if (table === pointLedger) {
        return {
          values: async (value: unknown) => {
            insertedLedger.push(value);
          },
        };
      }

      throw new Error("Unexpected insert table in placeBet tx stub.");
    },
    update(table: unknown) {
      if (table === viewerBalances) {
        return {
          set() {
            return {
              where() {
                return {
                  returning: async () => {
                    if (!balanceDebitSucceeds) {
                      return [];
                    }
                    balanceRow.currentBalance -= amount;
                    balanceRow.lifetimeSpent += amount;
                    balanceRow.lastSyncedAt = new Date();
                    return [{ viewerId: balanceRow.viewerId }];
                  },
                };
              },
            };
          },
        };
      }

      if (table === betOptions) {
        return {
          set() {
            return {
              where: async () => {
                optionRows[0]!.poolAmount += amount;
              },
            };
          },
        };
      }

      throw new Error("Unexpected update table in placeBet tx stub.");
    },
  };

  return {
    insertedBetEntries,
    insertedLedger,
    balanceRow,
    optionRows,
    db: {
      select() {
        return {
          from(table: unknown) {
            if (table === users) {
              return {
                where() {
                  return {
                    limit: async () => [viewerRow],
                  };
                },
              };
            }

            if (table === viewerBalances) {
              return {
                where() {
                  return {
                    limit: async () => [balanceRow],
                  };
                },
              };
            }

            if (table === redemptions) {
              return {
                where() {
                  return {
                    orderBy: async () => [],
                  };
                },
              };
            }

            if (table === bets) {
              return {
                orderBy: async () => [betRow],
              };
            }

            if (table === betOptions) {
              return Promise.resolve(optionRows);
            }

            if (table === betEntries) {
              return {
                where: async () => [],
              };
            }

            throw new Error("Unexpected table in placeBet db stub.");
          },
        };
      },
      async transaction<T>(callback: (txArg: typeof tx) => Promise<T>) {
        return callback(tx);
      },
    },
  };
}

function createStreamerbotEventDb({
  usersRows,
  balanceRows,
  existingEvents = [],
}: {
  usersRows: Array<{
    id: string;
    googleUserId: string | null;
    email: string | null;
    youtubeChannelId: string;
    youtubeDisplayName: string;
    youtubeHandle?: string | null;
    avatarUrl: string | null;
    isLinked: boolean;
    excludeFromRanking: boolean;
    createdAt: Date;
  }>;
  balanceRows: Array<{
    viewerId: string;
    currentBalance: number;
    lifetimeEarned: number;
    lifetimeSpent: number;
    lastSyncedAt: Date;
  }>;
  existingEvents?: Array<{ eventId: string }>;
}) {
  const insertedEvents: unknown[] = [];
  const insertedLedger: unknown[] = [];

  return {
    insertedEvents,
    insertedLedger,
    db: {
      select() {
        return {
          from(table: unknown) {
            if (table === streamerbotEventLog) {
              return {
                where() {
                  return {
                    limit: async () => existingEvents,
                  };
                },
              };
            }

            if (table === users) {
              return {
                where() {
                  return {
                    limit: async () => usersRows,
                  };
                },
              };
            }

            if (table === viewerBalances) {
              return {
                where() {
                  return {
                    limit: async () => balanceRows,
                  };
                },
              };
            }

            throw new Error("Unexpected table in streamerbot event db stub.");
          },
        };
      },
      update(table: unknown) {
        if (table === users) {
          return {
            set(values: Partial<(typeof usersRows)[number]>) {
              return {
                where: async () => {
                  Object.assign(usersRows[0], values);
                },
              };
            },
          };
        }

        if (table === viewerBalances) {
          return {
            set(values: { currentBalance?: number; lifetimeEarned?: number; lifetimeSpent?: number; lastSyncedAt?: Date }) {
              return {
                where: async () => {
                  if (typeof values.currentBalance === "number") {
                    balanceRows[0]!.currentBalance = values.currentBalance;
                  }
                  if (typeof values.lifetimeEarned === "number") {
                    balanceRows[0]!.lifetimeEarned = values.lifetimeEarned;
                  }
                  if (typeof values.lifetimeSpent === "number") {
                    balanceRows[0]!.lifetimeSpent = values.lifetimeSpent;
                  }
                  if (values.lastSyncedAt) {
                    balanceRows[0]!.lastSyncedAt = values.lastSyncedAt;
                  }
                },
              };
            },
          };
        }

        throw new Error("Unexpected update table in streamerbot event db stub.");
      },
      insert(table: unknown) {
        if (table === streamerbotEventLog) {
          return {
            values: async (value: unknown) => {
              insertedEvents.push(value);
            },
          };
        }

        if (table === users) {
          return {
            values: async (
              value: Omit<(typeof usersRows)[number], "createdAt"> & { createdAt?: Date },
            ) => {
              usersRows.push({
                ...value,
                youtubeHandle: value.youtubeHandle ?? null,
                createdAt: value.createdAt ?? new Date(),
              });
            },
          };
        }

        if (table === viewerBalances) {
          return {
            values: async (
              value: Omit<(typeof balanceRows)[number], "lastSyncedAt"> & { lastSyncedAt?: Date },
            ) => {
              balanceRows.push({
                ...value,
                lastSyncedAt: value.lastSyncedAt ?? new Date(),
              });
            },
          };
        }

        if (table === pointLedger) {
          return {
            values: async (value: unknown) => {
              insertedLedger.push(value);
            },
          };
        }

        throw new Error("Unexpected insert table in streamerbot event db stub.");
      },
    },
  };
}

describe("listBets", () => {
  beforeEach(() => {
    getDbMock.mockReset();
    delete (globalThis as typeof globalThis & { __lojaDemoStore?: unknown }).__lojaDemoStore;
  });

  it("falls back to demo bets when the bets table query is unavailable", async () => {
    getDbMock.mockReturnValue(
      createDb({
        betsError: new Error('relation "bets" does not exist'),
      }),
    );

    const result = await listBets();

    expect(result).toHaveLength(demoBetRecords.length);
    expect(result.find((bet) => bet.id === "bet-1")).toMatchObject({
      question: "Ela vai zerar o boss sem morrer?",
      totalPool: 4650,
    });
  });

  it("falls back to demo bets for authenticated viewers when bet option queries fail", async () => {
    getDbMock.mockReturnValue(
      createDb({
        usersRows: [
          {
            id: "viewer_ana",
            googleUserId: "google_ana",
            email: "ana@example.com",
            youtubeChannelId: "yt_ana",
            youtubeDisplayName: "Ana Neon",
            avatarUrl: null,
            isLinked: true,
            excludeFromRanking: false,
            createdAt: new Date("2026-03-31T10:00:00.000Z"),
          },
        ],
        optionsError: new Error('Failed query: select * from "bet_options"'),
      }),
    );

    const result = await listBets("viewer_ana");

    expect(result.find((bet) => bet.id === "bet-2")?.viewerPosition).toMatchObject({
      optionId: "opt-2b",
      amount: 400,
      payoutAmount: 683,
      isWinner: true,
    });
  });

  it("rethrows unrelated database errors", async () => {
    getDbMock.mockReturnValue(
      createDb({
        betsError: new Error("database unavailable"),
      }),
    );

    await expect(listBets()).rejects.toThrow("database unavailable");
  });
});

describe("bet lifecycle transitions", () => {
  beforeEach(() => {
    getDbMock.mockReset();
    getDbMock.mockReturnValue(null);
    delete (globalThis as typeof globalThis & { __lojaDemoStore?: unknown }).__lojaDemoStore;
  });

  it("rejects locking a resolved bet", async () => {
    await expect(lockBet("bet-2")).rejects.toThrow("bet_already_resolved");
  });

  it("rejects resolving an open bet", async () => {
    await expect(resolveBet({ betId: "bet-1", winningOptionId: "opt-1a" })).rejects.toThrow("bet_not_locked");
  });

  it("rejects cancelling a resolved bet", async () => {
    await expect(cancelBet("bet-2")).rejects.toThrow("bet_already_resolved");
  });

  it("allows the expected open -> lock -> resolve flow", async () => {
    const locked = await lockBet("bet-1");
    expect(locked.status).toBe("locked");

    const resolved = await resolveBet({ betId: "bet-1", winningOptionId: "opt-1a" });
    expect(resolved.status).toBe("resolved");
    expect(resolved.winningOptionId).toBe("opt-1a");
  });

  it("refunds every bettor when nobody picked the winning option", async () => {
    const beforeAna = await getViewerDashboard("viewer_ana");
    const beforeCaio = await getViewerDashboard("viewer_caio");
    expect(beforeAna).not.toBeNull();
    expect(beforeCaio).not.toBeNull();

    const bet = await createBet({
      question: "Ela acha o atalho secreto antes do boss final?",
      closesAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      options: ["Sim", "Nao"],
    });

    await placeBet({
      viewerId: "viewer_ana",
      betId: bet.id,
      optionId: bet.options[0].id,
      amount: 40,
      source: "web",
    });
    await placeBet({
      viewerId: "viewer_caio",
      betId: bet.id,
      optionId: bet.options[0].id,
      amount: 60,
      source: "web",
    });

    await lockBet(bet.id);

    const resolved = await resolveBet({ betId: bet.id, winningOptionId: bet.options[1].id });
    expect(resolved.status).toBe("resolved");
    expect(resolved.winningOptionId).toBe(bet.options[1].id);

    const anaBet = (await listBets("viewer_ana")).find((entry) => entry.id === bet.id);
    const caioBet = (await listBets("viewer_caio")).find((entry) => entry.id === bet.id);
    expect(anaBet?.viewerPosition).toMatchObject({
      optionId: bet.options[0].id,
      payoutAmount: null,
      refundedAt: expect.any(String),
        settledAt: null,
        isWinner: false,
    });
    expect(caioBet?.viewerPosition).toMatchObject({
      optionId: bet.options[0].id,
      payoutAmount: null,
      refundedAt: expect.any(String),
      settledAt: null,
      isWinner: false,
    });

    const afterAna = await getViewerDashboard("viewer_ana");
    const afterCaio = await getViewerDashboard("viewer_caio");
    expect(afterAna?.balance.currentBalance).toBe(beforeAna?.balance.currentBalance);
    expect(afterCaio?.balance.currentBalance).toBe(beforeCaio?.balance.currentBalance);
  });

  it("allows cancelling an open bet", async () => {
    const cancelled = await cancelBet("bet-3");
    expect(cancelled.status).toBe("cancelled");
  });
});

describe("placeBet database guards", () => {
  beforeEach(() => {
    getDbMock.mockReset();
  });

  it("maps a concurrent insert conflict to duplicate bet", async () => {
    const { db } = createPlaceBetDb({ insertConflict: true });
    getDbMock.mockReturnValue(db);

    await expect(
      placeBet({
        viewerId: "viewer-db-1",
        betId: "bet-db-1",
        optionId: "bet-opt-1",
        amount: 50,
        source: "web",
      }),
    ).rejects.toThrow("aposta_ja_registrada");
  });

  it("maps a failed guarded debit to insufficient balance", async () => {
    const { db } = createPlaceBetDb({ balanceDebitSucceeds: false });
    getDbMock.mockReturnValue(db);

    await expect(
      placeBet({
        viewerId: "viewer-db-1",
        betId: "bet-db-1",
        optionId: "bet-opt-1",
        amount: 50,
        source: "web",
      }),
    ).rejects.toThrow("saldo_insuficiente");
  });
});

describe("placeBetFromChatCommand", () => {
  beforeEach(() => {
    getDbMock.mockReset();
    getDbMock.mockReturnValue(null);
    delete (globalThis as typeof globalThis & { __lojaDemoStore?: unknown }).__lojaDemoStore;
  });

  it("allows an unlinked viewer to place a bet from chat by youtube channel id", async () => {
    const result = await placeBetFromChatCommand({
      viewerExternalId: "yt_lia",
      youtubeDisplayName: "Lia Pixel",
      betId: "bet-1",
      optionIndex: 2,
      amount: 75,
      source: "streamerbot_chat",
    });

    expect(result.viewer.id).toBe("viewer_lia");
    expect(result.option.id).toBe("opt-1b");
    expect(result.entry).toMatchObject({
      betId: "bet-1",
      optionId: "opt-1b",
      viewerId: "viewer_lia",
      amount: 75,
    });

    const bets = await listBets("viewer_lia");
    const bet = bets.find((entry) => entry.id === "bet-1");
    expect(bet?.viewerPosition).toMatchObject({
      optionId: "opt-1b",
      amount: 75,
    });

    const dashboard = await getViewerDashboard("viewer_lia");
    expect(dashboard?.balance.currentBalance).toBe(445);
  });

  it("requires betId when there is more than one open bet", async () => {
    await expect(
      placeBetFromChatCommand({
        viewerExternalId: "yt_lia",
        youtubeDisplayName: "Lia Pixel",
        optionIndex: 1,
        amount: 50,
        source: "streamerbot_chat",
      }),
    ).rejects.toThrow("multiple_open_bets");
  });
});

describe("game suggestions", () => {
  beforeEach(() => {
    getDbMock.mockReset();
    getDbMock.mockReturnValue(null);
    delete (globalThis as typeof globalThis & { __lojaDemoStore?: unknown }).__lojaDemoStore;
  });

  it("creates a new game suggestion in demo mode", async () => {
    const created = await createGameSuggestion({
      viewerId: "viewer_ana",
      name: "Balatro",
      description: "Me deixa te ver quebrando a run.",
    });

    expect(created).toMatchObject({
      name: "Balatro",
      status: "open",
      totalVotes: 0,
      suggestedBy: "Ana Neon",
    });

    const suggestions = await listGameSuggestions("viewer_ana");
    expect(suggestions.some((entry) => entry.name === "Balatro")).toBe(true);
  });

  it("rejects duplicate open suggestions by slug", async () => {
    await expect(
      createGameSuggestion({
        viewerId: "viewer_caio",
        name: "Hades II",
      }),
    ).rejects.toThrow("suggestion_already_exists");
  });

  it("spends balance and increases votes when boosting", async () => {
    const before = await getViewerDashboard("viewer_ana");
    expect(before).not.toBeNull();
    const beforeBalance = before?.balance.currentBalance ?? 0;
    const beforeSpent = before?.balance.lifetimeSpent ?? 0;

    const updated = await boostGameSuggestion({
      suggestionId: "gs-4",
      viewerId: "viewer_ana",
      amount: 120,
      source: "web",
    });

    expect(updated.totalVotes).toBe(1320);
    expect(updated.viewerBoostTotal).toBe(120);

    const after = await getViewerDashboard("viewer_ana");
    expect(after?.balance.currentBalance).toBe(beforeBalance - 120);
    expect(after?.balance.lifetimeSpent).toBe(beforeSpent + 120);
  });

  it("blocks boost when the viewer has insufficient balance", async () => {
    await expect(
      boostGameSuggestion({
        suggestionId: "gs-1",
        viewerId: "viewer_lia",
        amount: 9999,
        source: "web",
      }),
    ).rejects.toThrow("saldo_insuficiente");
  });

  it("lets the admin update the suggestion status", async () => {
    const updated = await updateGameSuggestionStatus({
      suggestionId: "gs-4",
      status: "accepted",
    });

    expect(updated.status).toBe("accepted");

    const suggestions = await listAdminGameSuggestions();
    expect(suggestions.find((entry) => entry.id === "gs-4")?.status).toBe("accepted");
  });
});

describe("ensureViewerFromSession", () => {
  beforeEach(() => {
    getDbMock.mockReset();
    delete (globalThis as typeof globalThis & { __lojaDemoStore?: unknown }).__lojaDemoStore;
  });

  it("creates a synthetic channel id and excludes admin users from ranking", async () => {
    getDbMock.mockReturnValue(null);

    const viewer = await ensureViewerFromSession({
      googleUserId: "google-admin",
      email: "admin@example.com",
      name: "Admin",
      image: null,
    });

    expect(viewer).toMatchObject({
      email: "admin@example.com",
      youtubeChannelId: "session:google-admin",
      isLinked: false,
      excludeFromRanking: true,
    });
  });

  it("hides the synthetic fallback channel after a real YouTube channel syncs", async () => {
    getDbMock.mockReturnValue(null);

    const fallbackViewer = await ensureViewerFromSession({
      googleUserId: "google_lud",
      email: "lud@example.com",
      name: "Lud",
      image: null,
    });

    expect(fallbackViewer?.youtubeChannelId).toBe("session:google_lud");

    const linkedViewer = await ensureViewerFromSession({
      googleUserId: "google_lud",
      email: "lud@example.com",
      name: "Lud",
      image: null,
      youtubeChannels: [
        {
          youtubeChannelId: "UC_LUD_REAL",
          youtubeDisplayName: "LudyLops",
        },
      ],
    });

    expect(linkedViewer?.id).toBe(fallbackViewer?.id);

    const state = await getSessionViewerState({
      googleUserId: "google_lud",
      email: "lud@example.com",
    });
    const channels = await listViewerChannelsForGoogleAccount(state!.googleAccount.id);

    expect(channels.map((entry) => entry.youtubeChannelId)).toEqual(["UC_LUD_REAL"]);
    expect(state?.activeViewer.youtubeChannelId).toBe("UC_LUD_REAL");
  });

  it("stores the channel handle when a Google-linked channel syncs", async () => {
    getDbMock.mockReturnValue(null);

    const linkedViewer = await ensureViewerFromSession({
      googleUserId: "google_handle",
      email: "handle@example.com",
      name: "Handle",
      image: null,
      youtubeChannels: [
        {
          youtubeChannelId: "UC_HANDLE_REAL",
          youtubeDisplayName: "Handle Hero",
          youtubeHandle: "@handlehero",
        },
      ],
    });

    expect(linkedViewer?.youtubeHandle).toBe("@handlehero");

    const state = await getSessionViewerState({
      googleUserId: "google_handle",
      email: "handle@example.com",
    });
    const channels = await listViewerChannelsForGoogleAccount(state!.googleAccount.id);

    expect(state?.activeViewer.youtubeHandle).toBe("@handlehero");
    expect(channels[0]?.youtubeHandle).toBe("@handlehero");
  });

  it("prunes stale synthetic fallback rows once a real channel is already linked", async () => {
    getDbMock.mockReturnValue(null);

    const fallbackViewer = await ensureViewerFromSession({
      googleUserId: "google_lud",
      email: "lud@example.com",
      name: "Lud",
      image: null,
    });

    const store = (globalThis as typeof globalThis & {
      __lojaDemoStore?: {
        googleAccounts: Array<{ id: string; email: string; activeViewerId: string | null }>;
        viewers: Array<{
          id: string;
          googleUserId: string | null;
          email: string | null;
          youtubeChannelId: string;
          youtubeDisplayName: string;
          avatarUrl: string | null;
          isLinked: boolean;
          excludeFromRanking: boolean;
          createdAt: string;
        }>;
        balances: Array<{
          viewerId: string;
          currentBalance: number;
          lifetimeEarned: number;
          lifetimeSpent: number;
          lastSyncedAt: string;
        }>;
        googleAccountViewers: Array<{
          id: string;
          googleAccountId: string;
          viewerId: string;
          createdAt: string;
        }>;
      };
    }).__lojaDemoStore;
    const account = store?.googleAccounts.find((entry: { email: string }) => entry.email === "lud@example.com");
    expect(account).toBeTruthy();
    if (!store || !account) {
      throw new Error("Expected a demo store and account for the seeded Google user.");
    }

    store.viewers.push({
      id: "viewer_lud_real",
      googleUserId: "google_lud",
      email: "lud@example.com",
      youtubeChannelId: "UC_LUD_REAL",
      youtubeDisplayName: "LudyLops",
      avatarUrl: null,
      isLinked: true,
      excludeFromRanking: false,
      createdAt: new Date("2026-04-01T00:00:00.000Z").toISOString(),
    });
    store.balances.push({
      viewerId: "viewer_lud_real",
      currentBalance: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      lastSyncedAt: new Date("2026-04-01T00:00:00.000Z").toISOString(),
    });
    store.googleAccountViewers.push({
      id: "gav_lud_real",
      googleAccountId: account.id,
      viewerId: "viewer_lud_real",
      createdAt: new Date("2026-04-01T00:00:00.000Z").toISOString(),
    });
    account.activeViewerId = "viewer_lud_real";

    await ensureViewerFromSession({
      googleUserId: "google_lud",
      email: "lud@example.com",
      name: "Lud",
      image: null,
      youtubeChannels: [
        {
          youtubeChannelId: "UC_LUD_REAL",
          youtubeDisplayName: "LudyLops",
        },
      ],
    });

    const channels = await listViewerChannelsForGoogleAccount(account.id);

    expect(channels.map((entry) => entry.youtubeChannelId)).toEqual(["UC_LUD_REAL"]);
    expect(store.viewers.some((entry: { id: string }) => entry.id === fallbackViewer?.id)).toBe(false);
    expect(store.googleAccountViewers.some((entry: { viewerId: string }) => entry.viewerId === fallbackViewer?.id)).toBe(false);
  });

  it("attaches an orphan chat viewer when the same user later logs in with Google", async () => {
    getDbMock.mockReturnValue(null);

    const linkedViewer = await ensureViewerFromSession({
      googleUserId: "google_lia",
      email: "lia@example.com",
      name: "Lia",
      image: null,
      youtubeChannels: [
        {
          youtubeChannelId: "yt_lia",
          youtubeDisplayName: "Lia Pixel",
        },
      ],
    });

    expect(linkedViewer).toMatchObject({
      id: "viewer_lia",
      googleUserId: "google_lia",
      email: "lia@example.com",
      youtubeChannelId: "yt_lia",
      youtubeDisplayName: "Lia Pixel",
      isLinked: true,
    });

    const state = await getSessionViewerState({
      googleUserId: "google_lia",
      email: "lia@example.com",
    });
    expect(state?.activeViewer.id).toBe("viewer_lia");
    expect(state?.googleAccount.googleUserId).toBe("google_lia");

    const channels = await listViewerChannelsForGoogleAccount(state!.googleAccount.id);
    expect(channels.map((entry) => entry.id)).toContain("viewer_lia");
  });

  it("links all Google-owned channels and preserves the selected active viewer", async () => {
    getDbMock.mockReturnValue(null);

    const linkedViewer = await ensureViewerFromSession({
      googleUserId: "google_ana",
      email: "ana@example.com",
      name: "Ana",
      image: null,
      youtubeChannels: [
        {
          youtubeChannelId: "yt_ana",
          youtubeDisplayName: "Ana Neon",
        },
        {
          youtubeChannelId: "UC_ANA_ALT",
          youtubeDisplayName: "Ana Alt",
        },
      ],
    });

    expect(linkedViewer).toMatchObject({
      id: "viewer_ana",
      youtubeChannelId: "yt_ana",
      youtubeDisplayName: "Ana Neon",
      isLinked: true,
    });

    const state = await getSessionViewerState({
      googleUserId: "google_ana",
      email: "ana@example.com",
    });
    expect(state?.activeViewer.id).toBe(linkedViewer?.id);

    const channels = await listViewerChannelsForGoogleAccount(state!.googleAccount.id);
    expect(channels.map((entry) => entry.youtubeChannelId)).toEqual(
      expect.arrayContaining(["yt_ana", "UC_ANA_ALT"]),
    );

    const altViewer = channels.find((entry) => entry.youtubeChannelId === "UC_ANA_ALT");
    expect(altViewer).toBeTruthy();

    await setActiveViewerForGoogleAccount(state!.googleAccount.id, altViewer!.id);
    await ensureViewerFromSession({
      googleUserId: "google_ana",
      email: "ana@example.com",
      name: "Ana",
      image: null,
      youtubeChannels: [
        {
          youtubeChannelId: "UC_ANA_ALT",
          youtubeDisplayName: "Ana Alt",
        },
        {
          youtubeChannelId: "yt_ana",
          youtubeDisplayName: "Ana Neon",
        },
      ],
    });

    const switchedState = await getSessionViewerState({
      googleUserId: "google_ana",
      email: "ana@example.com",
    });
    expect(switchedState?.activeViewer.id).toBe(altViewer!.id);
  });

  it("keeps the same Google-linked viewer when that user later appears in chat", async () => {
    getDbMock.mockReturnValue(null);

    const linkedViewer = await ensureViewerFromSession({
      googleUserId: "google_ludy",
      email: "ludy@example.com",
      name: "Ludy",
      image: null,
      youtubeChannels: [
        {
          youtubeChannelId: "UC_LUDY_REAL",
          youtubeDisplayName: "LudyLops",
        },
      ],
    });

    const result = await ingestStreamerbotEvent({
      eventId: "evt-google-then-chat",
      eventType: "presence_tick",
      viewerExternalId: "UC_LUDY_REAL",
      youtubeDisplayName: "LudyLops",
      amount: 5,
      occurredAt: "2026-04-01T12:00:00.000Z",
      payload: {},
    });

    expect(result).toMatchObject({
      mode: "demo",
      viewerCreated: false,
      balanceUpdated: true,
      ledgerInserted: true,
      viewerId: linkedViewer?.id,
    });

    const state = await getSessionViewerState({
      googleUserId: "google_ludy",
      email: "ludy@example.com",
    });
    const channels = await listViewerChannelsForGoogleAccount(state!.googleAccount.id);
    const activeChannel = channels.find((entry) => entry.id === linkedViewer?.id);

    expect(activeChannel).toMatchObject({
      youtubeChannelId: "UC_LUDY_REAL",
      currentBalance: 5,
      lifetimeEarned: 5,
    });
  });
});

describe("ingestStreamerbotEvent", () => {
  beforeEach(() => {
    getDbMock.mockReset();
    isStreamerbotLivestreamActiveMock.mockReset();
    isStreamerbotLivestreamActiveMock.mockResolvedValue(true);
    delete (globalThis as typeof globalThis & { __lojaDemoStore?: unknown }).__lojaDemoStore;
  });

  it("updates an existing viewer display name and handle from live events", async () => {
    const usersRows = [
      {
        id: "viewer-1",
        googleUserId: null,
        email: null,
        youtubeChannelId: "UC123",
        youtubeDisplayName: "UC123",
        youtubeHandle: null,
        avatarUrl: null,
        isLinked: false,
        excludeFromRanking: false,
        createdAt: new Date("2026-03-31T10:00:00.000Z"),
      },
    ];
    const balanceRows = [
      {
        viewerId: "viewer-1",
        currentBalance: 10,
        lifetimeEarned: 10,
        lifetimeSpent: 0,
        lastSyncedAt: new Date("2026-03-31T10:00:00.000Z"),
      },
    ];
    const { db, insertedEvents, insertedLedger } = createStreamerbotEventDb({ usersRows, balanceRows });
    getDbMock.mockReturnValue(db);

    const result = await ingestStreamerbotEvent({
      eventId: "evt-1",
      eventType: "presence_tick",
      viewerExternalId: "UC123",
      youtubeDisplayName: "Viewer Name",
      youtubeHandle: "viewername",
      amount: 5,
      occurredAt: "2026-03-31T12:00:00.000Z",
      payload: {},
    });

    expect(result).toMatchObject({
      mode: "database",
      deduped: false,
      viewerCreated: false,
      balanceUpdated: true,
      ledgerInserted: true,
      viewerId: "viewer-1",
    });
    expect(usersRows[0]?.youtubeDisplayName).toBe("Viewer Name");
    expect(usersRows[0]?.youtubeHandle).toBe("@viewername");
    expect(insertedEvents).toHaveLength(1);
    expect(insertedLedger).toHaveLength(1);
  });

  it("stores the viewer handle when a live event creates a new viewer", async () => {
    const usersRows: Parameters<typeof createStreamerbotEventDb>[0]["usersRows"] = [];
    const balanceRows: Parameters<typeof createStreamerbotEventDb>[0]["balanceRows"] = [];
    const { db, insertedEvents, insertedLedger } = createStreamerbotEventDb({ usersRows, balanceRows });
    getDbMock.mockReturnValue(db);

    const result = await ingestStreamerbotEvent({
      eventId: "evt-new-viewer",
      eventType: "presence_tick",
      viewerExternalId: "UC999",
      youtubeDisplayName: "Fresh Viewer",
      youtubeHandle: "@freshviewer",
      amount: 5,
      occurredAt: "2026-03-31T12:00:00.000Z",
      payload: {},
    });

    expect(result).toMatchObject({
      mode: "database",
      deduped: false,
      viewerCreated: true,
      balanceUpdated: true,
      ledgerInserted: true,
    });
    expect(usersRows[0]).toMatchObject({
      youtubeChannelId: "UC999",
      youtubeDisplayName: "Fresh Viewer",
      youtubeHandle: "@freshviewer",
    });
    expect(insertedEvents).toHaveLength(1);
    expect(insertedLedger).toHaveLength(1);
  });

  it("ignores live-gated events when no livestream is active", async () => {
    isStreamerbotLivestreamActiveMock.mockResolvedValue(false);

    const usersRows = [
      {
        id: "viewer-1",
        googleUserId: null,
        email: null,
        youtubeChannelId: "UC123",
        youtubeDisplayName: "Viewer Name",
        avatarUrl: null,
        isLinked: false,
        excludeFromRanking: false,
        createdAt: new Date("2026-03-31T10:00:00.000Z"),
      },
    ];
    const balanceRows = [
      {
        viewerId: "viewer-1",
        currentBalance: 10,
        lifetimeEarned: 10,
        lifetimeSpent: 0,
        lastSyncedAt: new Date("2026-03-31T10:00:00.000Z"),
      },
    ];
    const { db, insertedEvents, insertedLedger } = createStreamerbotEventDb({ usersRows, balanceRows });
    getDbMock.mockReturnValue(db);

    const result = await ingestStreamerbotEvent({
      eventId: "evt-offline",
      eventType: "presence_tick",
      viewerExternalId: "UC123",
      youtubeDisplayName: "Viewer Name",
      amount: 5,
      occurredAt: "2026-03-31T12:00:00.000Z",
      payload: {},
    });

    expect(result).toMatchObject({
      mode: "database",
      eventLogInserted: false,
      balanceUpdated: false,
      ledgerInserted: false,
      ignoredReason: "livestream_not_live",
    });
    expect(insertedEvents).toHaveLength(0);
    expect(insertedLedger).toHaveLength(0);
    expect(balanceRows[0]?.currentBalance).toBe(10);
  });

});

describe("product recommendations", () => {
  beforeEach(() => {
    getDbMock.mockReturnValue(null);
    delete (globalThis as typeof globalThis & { __lojaDemoStore?: unknown }).__lojaDemoStore;
  });

  it("deletes a saved recommendation in demo mode", async () => {
    const created = await createProductRecommendationFromInput({
      name: "Controle Pro",
      category: "perifericos",
      context: "Para jogar no setup da live.",
      imageUrl: "/uploads/pro-controller.jpg",
      href: "https://example.com/pro-controller",
      storeLabel: "Loja Teste",
      linkKind: "external",
      sortOrder: 9,
      isActive: true,
    });

    const deleted = await deleteProductRecommendation(created.id);
    const recommendations = await listAdminProductRecommendations();

    expect(deleted.id).toBe(created.id);
    expect(recommendations.some((entry) => entry.id === created.id)).toBe(false);
  });

  it("rejects deleting an unknown recommendation", async () => {
    await expect(deleteProductRecommendation("missing-recommendation")).rejects.toThrow(
      "recommendation_not_found",
    );
  });
});
