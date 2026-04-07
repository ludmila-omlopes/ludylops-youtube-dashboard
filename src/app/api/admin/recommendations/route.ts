import { fail, isTrustedAppMutationRequest, ok, requireAdminApiSession } from "@/lib/api";
import {
  createProductRecommendationFromInput,
  listAdminProductRecommendations,
} from "@/lib/db/repository";
import {
  formatProductRecommendationSchemaError,
  productRecommendationSchema,
} from "@/lib/recommendation-schemas";
import { slugify } from "@/lib/utils";
import { ZodError } from "zod";

export async function GET() {
  const session = await requireAdminApiSession();
  if (!session) {
    return fail("Forbidden", 403);
  }

  return ok(await listAdminProductRecommendations());
}

export async function POST(request: Request) {
  if (!isTrustedAppMutationRequest(request)) {
    return fail("Forbidden", 403);
  }

  const session = await requireAdminApiSession();
  if (!session) {
    return fail("Forbidden", 403);
  }

  try {
    const payload = productRecommendationSchema.parse(await request.json());
    const recommendation = await createProductRecommendationFromInput({
      ...payload,
      slug: payload.slug ?? slugify(payload.name),
    });

    return ok(recommendation, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return fail(formatProductRecommendationSchemaError(error), 400);
    }

    if (error instanceof SyntaxError) {
      return fail("Payload invalido.", 400);
    }

    const message = error instanceof Error ? error.message : "Falha ao criar recomendacao.";
    return fail(message, 400);
  }
}
