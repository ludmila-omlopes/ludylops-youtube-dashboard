import type { ProductRecommendationCategory } from "@/lib/types";

export type RecommendationCategory = {
  key: ProductRecommendationCategory;
  label: string;
  accentClass: string;
};

export const recommendationCategories: RecommendationCategory[] = [
  {
    key: "videogames",
    label: "Videogames",
    accentClass: "bg-[var(--color-blue)]",
  },
  {
    key: "perifericos",
    label: "Perifericos",
    accentClass: "bg-[var(--color-purple)]",
  },
  {
    key: "acessorios",
    label: "Acessorios",
    accentClass: "bg-[var(--color-pink)]",
  },
];
