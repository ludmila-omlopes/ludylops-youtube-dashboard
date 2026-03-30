import { ok } from "@/lib/api";
import { getCatalog } from "@/lib/db/repository";

export async function GET() {
  return ok(await getCatalog());
}
