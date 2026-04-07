import { RedemptionGrid } from "@/components/redemption-grid";
import { getCatalog } from "@/lib/db/repository";

export default async function ResgatesPage() {
  const catalog = await getCatalog();

  return (
    <div className="flex w-full flex-col pb-20 pt-8">
      <section className="landing-plane surface-hero relative overflow-hidden py-8 sm:py-10">
        <div className="bg-dots-light pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mono text-xs font-bold uppercase tracking-[0.32em] text-[var(--color-ink-soft)]">
                🎁 Resgates
              </p>
              <h1
                className="mt-3 text-4xl uppercase sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Gaste seus pipetz aqui.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-ink-soft)] sm:text-base">
                Sons, imagens, overlays e mais. Cada resgate dispara um efeito na live em tempo real.
              </p>
            </div>
            <div className="sticker sticker-tilt-right hidden accent-chip-strong px-4 py-2 text-sm sm:inline-flex">
              {catalog.length} itens
            </div>
          </div>
        </div>
      </section>
      <RedemptionGrid items={catalog} expanded fullWidth sectionClassName="bg-[var(--color-paper-pink)]" />
    </div>
  );
}
