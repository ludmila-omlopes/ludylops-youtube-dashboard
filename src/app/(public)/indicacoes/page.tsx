/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";

import { listProductRecommendations } from "@/lib/db/repository";
import { recommendationCategories } from "@/lib/recommendations";
import type { ProductRecommendationRecord } from "@/lib/types";

export const metadata: Metadata = {
  title: "Indicacoes | Pipetz",
  description: "Minha pagina publica com consoles, perifericos e acessorios que eu recomendo para a comunidade.",
};

function recommendationRel(linkKind: ProductRecommendationRecord["linkKind"]) {
  return linkKind === "affiliate" ? "noopener noreferrer sponsored" : "noopener noreferrer";
}

function RecommendationCard({
  item,
  categoryLabel,
  accentClass,
}: {
  item: ProductRecommendationRecord;
  categoryLabel: string;
  accentClass: string;
}) {
  return (
    <article className="panel surface-section overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[240px_1fr]">
        <div className={`min-h-[220px] border-b-[3px] border-[var(--color-ink)] md:border-b-0 md:border-r-[3px] ${accentClass}`}>
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
        </div>

        <div className="flex flex-col justify-between gap-5 p-5 sm:p-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
                {categoryLabel}
              </span>
              <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink-soft)]">
                {item.storeLabel}
              </span>
              <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink-soft)]">
                {item.linkKind === "affiliate" ? "Link afiliado" : "Link externo"}
              </span>
            </div>

            <h2
              className="mt-4 text-2xl uppercase leading-[0.95] sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {item.name}
            </h2>

            <p className="mt-4 text-sm leading-7 text-[var(--color-ink-soft)] sm:text-base">
              {item.context}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t-[2px] border-[var(--color-ink)] pt-4">
            <p className="max-w-xl text-sm font-bold leading-6 text-[var(--color-ink-soft)]">
              {item.linkKind === "affiliate"
                ? "Link afiliado marcado de forma explicita antes do clique."
                : "Link externo comum para abrir a pagina do produto."}
            </p>

            <a
              href={item.href}
              target="_blank"
              rel={recommendationRel(item.linkKind)}
              className="btn-brutal bg-[var(--color-paper)] px-5 py-3 text-xs text-[var(--color-ink)]"
            >
              Abrir produto
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export default async function IndicacoesPage() {
  const productRecommendations = await listProductRecommendations();
  const categoryLookup = Object.fromEntries(
    recommendationCategories.map((category) => [category.key, category]),
  );

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="panel surface-section p-6 sm:p-8">
        <h1
          className="text-4xl uppercase leading-none sm:text-5xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Indicacoes
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-ink-soft)] sm:text-base">
          Produtos que eu recomendo para setup, jogo e live. Se algum link virar afiliado,
          isso aparece marcado no proprio item antes do clique.
        </p>
      </header>

      <section className="space-y-4">
        {productRecommendations.length === 0 ? (
          <div className="panel surface-section p-6 text-sm font-bold text-[var(--color-ink-soft)]">
            Nenhuma recomendacao publicada ainda.
          </div>
        ) : null}

        {productRecommendations.map((item) => {
          const category = categoryLookup[item.category];

          return (
            <RecommendationCard
              key={item.id}
              item={item}
              categoryLabel={category?.label ?? item.category}
              accentClass={category?.accentClass ?? "bg-[var(--color-paper)]"}
            />
          );
        })}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/" className="btn-brutal bg-[var(--color-paper)] px-5 py-3 text-xs text-[var(--color-ink)]">
          Voltar para home
        </Link>
        <Link href="/jogos" className="btn-brutal bg-[var(--color-blue)] px-5 py-3 text-xs text-[var(--color-accent-ink)]">
          Ver jogos
        </Link>
      </div>
    </div>
  );
}
