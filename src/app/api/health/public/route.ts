import { ok } from "@/lib/api";
import { getBridgeStatus } from "@/lib/db/repository";
import { isDemoMode } from "@/lib/env";

export async function GET() {
  const bridge = await getBridgeStatus();
  return ok({
    mode: isDemoMode ? "demo" : "database",
    bridgeCount: bridge.length,
    now: new Date().toISOString(),
  });
}
