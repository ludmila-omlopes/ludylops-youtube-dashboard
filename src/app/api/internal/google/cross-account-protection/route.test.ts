import { beforeEach, describe, expect, it, vi } from "vitest";

const afterCallbacks = vi.hoisted(() => [] as Array<() => void | Promise<void>>);
const validateGoogleRiscTokenMock = vi.hoisted(() => vi.fn());
const listGoogleRiscEventsMock = vi.hoisted(() => vi.fn());
const registerGoogleRiscDeliveryMock = vi.hoisted(() => vi.fn());
const applyGoogleCrossAccountProtectionEventMock = vi.hoisted(() => vi.fn());
const finalizeGoogleRiscDeliveryMock = vi.hoisted(() => vi.fn());

vi.mock("next/server", () => ({
  after: (callback: () => void | Promise<void>) => {
    afterCallbacks.push(callback);
  },
  NextResponse: {
    json(body: unknown, init?: ResponseInit) {
      return Response.json(body, init);
    },
  },
}));

vi.mock("@/lib/google/risc", () => ({
  validateGoogleRiscToken: validateGoogleRiscTokenMock,
  listGoogleRiscEvents: listGoogleRiscEventsMock,
  summarizeGoogleRiscToken: vi.fn(() => ({ jti: "evt-123" })),
}));

vi.mock("@/lib/db/repository", () => ({
  registerGoogleRiscDelivery: registerGoogleRiscDeliveryMock,
  applyGoogleCrossAccountProtectionEvent: applyGoogleCrossAccountProtectionEventMock,
  finalizeGoogleRiscDelivery: finalizeGoogleRiscDeliveryMock,
}));

import { POST } from "@/app/api/internal/google/cross-account-protection/route";

const SESSIONS_REVOKED_EVENT = "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked";

describe("google cross-account-protection route", () => {
  beforeEach(() => {
    afterCallbacks.length = 0;
    validateGoogleRiscTokenMock.mockReset();
    listGoogleRiscEventsMock.mockReset();
    registerGoogleRiscDeliveryMock.mockReset();
    applyGoogleCrossAccountProtectionEventMock.mockReset();
    finalizeGoogleRiscDeliveryMock.mockReset();
  });

  it("returns 400 when the token is missing", async () => {
    const response = await POST(new Request("https://example.test", { method: "POST", body: "" }));

    expect(response.status).toBe(400);
  });

  it("acknowledges with 202 before the after callback processes the delivery", async () => {
    validateGoogleRiscTokenMock.mockResolvedValue({
      payload: {
        jti: "evt-123",
        iat: 1_776_176_400,
        events: {
          [SESSIONS_REVOKED_EVENT]: {},
        },
      },
    });
    listGoogleRiscEventsMock.mockReturnValue([
      {
        eventType: SESSIONS_REVOKED_EVENT,
        googleUserId: "google-user-1",
        reason: null,
      },
    ]);
    registerGoogleRiscDeliveryMock.mockResolvedValue({
      accepted: true,
      delivery: { jti: "evt-123" },
    });
    applyGoogleCrossAccountProtectionEventMock.mockResolvedValue({
      matchedAccountId: "ga-1",
    });
    finalizeGoogleRiscDeliveryMock.mockResolvedValue(null);

    const response = await POST(new Request("https://example.test", { method: "POST", body: "token" }));

    expect(response.status).toBe(202);
    expect(registerGoogleRiscDeliveryMock).not.toHaveBeenCalled();
    expect(applyGoogleCrossAccountProtectionEventMock).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(1);

    await afterCallbacks[0]!();

    expect(registerGoogleRiscDeliveryMock).toHaveBeenCalledWith({
      jti: "evt-123",
      eventTypes: [SESSIONS_REVOKED_EVENT],
      issuedAt: "2026-04-14T14:20:00.000Z",
    });
    expect(applyGoogleCrossAccountProtectionEventMock).toHaveBeenCalledTimes(1);
    expect(finalizeGoogleRiscDeliveryMock).toHaveBeenCalledWith({
      jti: "evt-123",
      matchedAccountCount: 1,
    });
  });
});
