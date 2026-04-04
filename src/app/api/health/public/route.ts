import { NextResponse } from "next/server";

import { getPublicAuthHealth } from "@/lib/auth/public-health";
import { getBridgeStatus } from "@/lib/db/repository";
import { isDemoMode } from "@/lib/env";
import { buildPublicHealthSnapshot } from "@/lib/health/public";

export async function GET() {
  const mode = isDemoMode ? "demo" : "database";
  const auth = getPublicAuthHealth();

  try {
    const bridge = await getBridgeStatus();
    const snapshot = buildPublicHealthSnapshot({
      mode,
      auth,
      bridge,
    });

    return NextResponse.json(
      {
        ok: snapshot.status === "ok",
        data: snapshot,
      },
      {
        status: snapshot.status === "ok" ? 200 : 503,
      },
    );
  } catch {
    const snapshot = buildPublicHealthSnapshot({
      mode,
      auth,
      bridge: [],
      bridgeQueryFailed: true,
    });

    return NextResponse.json(
      {
        ok: false,
        data: snapshot,
      },
      {
        status: 503,
      },
    );
  }
}
