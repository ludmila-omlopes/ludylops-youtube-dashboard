import { after, NextResponse } from "next/server";

import {
  applyGoogleCrossAccountProtectionEvent,
  finalizeGoogleRiscDelivery,
  registerGoogleRiscDelivery,
} from "@/lib/db/repository";
import { listGoogleRiscEvents, summarizeGoogleRiscToken, validateGoogleRiscToken } from "@/lib/google/risc";

export const runtime = "nodejs";

function isConfigurationError(error: unknown) {
  return error instanceof Error && error.message.includes("No Google OAuth client IDs configured");
}

export async function POST(request: Request) {
  const rawToken = (await request.text()).trim();
  if (!rawToken) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing Google Cross-Account Protection token.",
      },
      {
        status: 400,
      },
    );
  }

  try {
    const validated = await validateGoogleRiscToken(rawToken);
    if (!validated.payload.jti) {
      return NextResponse.json(
        {
          ok: false,
          error: "Google RISC token is missing jti.",
        },
        {
          status: 400,
        },
      );
    }

    const events = listGoogleRiscEvents(validated.payload);
    const eventId = validated.payload.jti;
    const occurredAt =
      typeof validated.payload.iat === "number"
        ? new Date(validated.payload.iat * 1000).toISOString()
        : new Date().toISOString();

    after(async () => {
      const receipt = await registerGoogleRiscDelivery({
        jti: eventId,
        eventTypes: events.map((entry) => entry.eventType),
        issuedAt: occurredAt,
      });

      if (!receipt.accepted) {
        console.info("[google-risc] duplicate delivery ignored", {
          jti: eventId,
          totalEvents: events.length,
        });
        return;
      }

      try {
        const updates = await Promise.all(
          events
            .filter((entry) => entry.googleUserId)
            .map((entry) =>
              applyGoogleCrossAccountProtectionEvent({
                eventId,
                eventType: entry.eventType,
                googleUserId: entry.googleUserId!,
                occurredAt,
                reason: entry.reason,
              }),
            ),
        );

        const matchedAccounts = updates.filter((entry) => entry.matchedAccountId).length;
        await finalizeGoogleRiscDelivery({
          jti: eventId,
          matchedAccountCount: matchedAccounts,
        });

        console.info("[google-risc] accepted token", {
          token: summarizeGoogleRiscToken(validated.payload),
          matchedAccounts,
          totalEvents: events.length,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await finalizeGoogleRiscDelivery({
          jti: eventId,
          matchedAccountCount: 0,
          lastError: message,
        });
        console.error("[google-risc] background processing failed", {
          jti: eventId,
          error: message,
        });
      }
    });

    return NextResponse.json(
      {
        ok: true,
        accepted: true,
        totalEvents: events.length,
      },
      {
        status: 202,
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Google RISC validation error.";
    console.error("[google-risc] rejected token", {
      error: message,
    });

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: isConfigurationError(error) ? 503 : 400,
      },
    );
  }
}
