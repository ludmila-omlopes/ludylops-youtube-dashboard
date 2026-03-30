import Image from "next/image";

import { CatalogItemRecord } from "@/lib/types";
import { formatPipetz } from "@/lib/utils";

const typeColorMap: Record<string, string> = {
  play_sound: "var(--color-lavender)",
  show_image: "var(--color-sky)",
  run_action: "var(--color-lilac)",
  overlay_scene_trigger: "var(--color-pink)",
  tts: "var(--color-periwinkle)",
  generic_streamerbot_action: "var(--color-mint)",
};

const cardBgCycle = [
  "bg-[var(--color-lavender)]",
  "bg-[var(--color-sky)]",
  "bg-[var(--color-periwinkle)]",
  "bg-[var(--color-lilac)]",
  "bg-[var(--color-mint)]",
  "bg-[var(--color-rose)]",
];

export function RedemptionGrid({
  items,
  expanded = false,
  viewerBalance,
}: {
  items: CatalogItemRecord[];
  expanded?: boolean;
  viewerBalance?: number;
}) {
  return (
    <section className="panel bg-[var(--color-lilac)] p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mono text-xs uppercase tracking-[0.32em] text-[var(--color-muted)]">
            Resgates disponiveis
          </p>
          <h2 className="mt-2 text-3xl font-bold uppercase" style={{ fontFamily: "var(--font-display)" }}>
            {expanded ? "Todos os resgates" : "Resgates em destaque"}
          </h2>
        </div>
        {typeof viewerBalance === "number" ? (
          <div className="badge-brutal bg-[var(--color-mint)] px-4 py-2 text-sm text-[var(--color-ink)]">
            Seus pipetz: {formatPipetz(viewerBalance)}
          </div>
        ) : null}
      </div>
      <div className={`mt-8 grid gap-5 ${expanded ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        {items.map((item, index) => {
          const canAfford = typeof viewerBalance === "number" ? viewerBalance >= item.cost : null;
          const typeBg = typeColorMap[item.type] ?? "var(--color-paper)";
          const cardBg = cardBgCycle[index % cardBgCycle.length];

          return (
            <article
              key={item.id}
              className={`card-brutal overflow-hidden ${cardBg}`}
            >
              {item.previewImageUrl ? (
                <div className="relative h-44 overflow-hidden border-b-[3px] border-[var(--color-ink)]">
                  <Image
                    src={item.previewImageUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className="badge-brutal inline-flex px-2 py-0.5 text-[10px] text-[var(--color-ink)]"
                      style={{ backgroundColor: typeBg }}
                    >
                      {item.type.replaceAll("_", " ")}
                    </p>
                    <h3 className="mt-2 text-xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                      {item.name}
                    </h3>
                  </div>
                  <div
                    className="badge-brutal shrink-0 px-3 py-1.5 text-sm text-[var(--color-ink)]"
                    style={{ backgroundColor: item.accentColor }}
                  >
                    {formatPipetz(item.cost)}
                  </div>
                </div>
                <p className="text-sm leading-6 text-[var(--color-muted)]">{item.description}</p>

                {canAfford !== null ? (
                  <div
                    className={`badge-brutal px-2 py-1 text-[10px] ${
                      canAfford
                        ? "bg-[var(--color-mint)] text-[var(--color-ink)]"
                        : "bg-[var(--color-pink)] text-[var(--color-ink)]"
                    }`}
                  >
                    {canAfford
                      ? "Da pra resgatar!"
                      : `Faltam ${formatPipetz(item.cost - viewerBalance!)} pipetz`}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  <span className="rounded-[var(--radius)] border border-[var(--color-muted)]/40 px-2 py-0.5">
                    CD: {item.viewerCooldownSeconds}s
                  </span>
                  <span className="rounded-[var(--radius)] border border-[var(--color-muted)]/40 px-2 py-0.5">
                    Global: {item.globalCooldownSeconds}s
                  </span>
                  <span className="rounded-[var(--radius)] border border-[var(--color-muted)]/40 px-2 py-0.5">
                    {item.stock === null ? "Infinito" : `Estoque ${item.stock}`}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
