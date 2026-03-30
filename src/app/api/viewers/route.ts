import { ok } from "@/lib/api";
import { getLeaderboard } from "@/lib/db/repository";

export async function GET() {
  return ok(await getLeaderboard());
}
