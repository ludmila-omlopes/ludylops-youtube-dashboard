import { z } from "zod";

export const gameSuggestionStatusSchema = z.enum(["open", "accepted", "played", "rejected"]);

export const createGameSuggestionSchema = z.object({
  name: z.string().trim().min(2, "Digite pelo menos 2 caracteres.").max(120, "Use no maximo 120 caracteres."),
  description: z
    .string()
    .trim()
    .max(500, "Use no maximo 500 caracteres.")
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const boostGameSuggestionSchema = z.object({
  amount: z.number().int().positive("Digite um valor inteiro positivo."),
});

export const updateGameSuggestionStatusSchema = z.object({
  status: gameSuggestionStatusSchema,
});

export function validateGameSuggestionDraft(input: {
  name: string;
  description?: string | null;
}) {
  const parsed = createGameSuggestionSchema.safeParse({
    name: input.name,
    description: input.description ?? undefined,
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Sugestao invalida.";
  }

  return null;
}

export function validateGameSuggestionBoostAmount(amount: number) {
  const parsed = boostGameSuggestionSchema.safeParse({ amount });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Valor invalido.";
  }
  return null;
}

export function formatGameSuggestionSchemaError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Payload invalido.";
}
