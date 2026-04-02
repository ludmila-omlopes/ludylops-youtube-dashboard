import { auth } from "@/auth";
import { ok } from "@/lib/api";
import { listBets } from "@/lib/db/repository";

export async function GET() {
  const session = await auth();
  return ok(await listBets(session?.user?.activeViewerId ?? null));
}
