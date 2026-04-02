import { fail, isTrustedAppMutationRequest, ok, requireAdminApiSession } from "@/lib/api";
import { getCatalog, upsertCatalogItem } from "@/lib/db/repository";
import { catalogItemSchema } from "@/lib/streamerbot/schemas";
import { slugify } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isTrustedAppMutationRequest(request)) {
    return fail("Forbidden", 403);
  }

  const session = await requireAdminApiSession();
  if (!session) {
    return fail("Forbidden", 403);
  }

  const { id } = await params;
  const existing = (await getCatalog()).find((item) => item.id === id);
  if (!existing) {
    return fail("Item não encontrado.", 404);
  }

  const payload = catalogItemSchema.parse(await request.json());
  const item = await upsertCatalogItem({
    ...existing,
    ...payload,
    id,
    slug: payload.slug ?? slugify(payload.name),
  });
  return ok(item);
}
