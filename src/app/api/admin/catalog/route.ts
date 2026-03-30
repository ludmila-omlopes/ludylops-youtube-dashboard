import { fail, ok, requireAdminApiSession } from "@/lib/api";
import { createCatalogItemFromInput, getCatalog } from "@/lib/db/repository";
import { catalogItemSchema } from "@/lib/streamerbot/schemas";

export async function GET() {
  const session = await requireAdminApiSession();
  if (!session) {
    return fail("Forbidden", 403);
  }
  return ok(await getCatalog());
}

export async function POST(request: Request) {
  const session = await requireAdminApiSession();
  if (!session) {
    return fail("Forbidden", 403);
  }

  const json = await request.json();
  const payload = catalogItemSchema.parse(json);
  const item = await createCatalogItemFromInput({
    slug: payload.slug,
    ...payload,
  });
  return ok(item, { status: 201 });
}
