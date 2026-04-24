import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const overlays = [
  {
    id: "quotes",
    name: "Quotes no OBS",
    description: "Overlay das quotes pagas em pipetz, com som embutido e visual pronto para browser source.",
    liveHref: "/obs/quotes",
    demoHref: "/obs/quotes?demo=1",
    apiHref: "/api/obs/quotes/current",
  },
];

export function AdminObsOverlaysPanel() {
  return (
    <section className="landing-plane landing-divider bg-[var(--color-paper)] py-8 sm:py-10">
      <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-10">
        <div className="panel surface-section p-6">
          <p className="mono text-xs uppercase tracking-[0.3em] text-[var(--color-ink-soft)]">
            Overlays do OBS
          </p>
          <h2
            className="mt-3 text-3xl uppercase sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Seus browser sources
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-ink-soft)] sm:text-base">
            Aqui ficam os overlays hospedados pelo app. Use o link real no OBS e o link de demo
            quando quiser conferir o visual fora da live.
          </p>

          <div className="mt-6 grid gap-4">
            {overlays.map((overlay, index) => (
              <Card
                key={overlay.id}
                variant="poster"
                className={`gap-4 p-5 text-[var(--color-accent-ink)] ${index % 2 === 0 ? "bg-[var(--color-blue)]" : "bg-[var(--color-mint)]"}`}
              >
                <CardHeader className="gap-2">
                  <CardDescription className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-accent-ink-soft)]">
                    browser source
                  </CardDescription>
                  <CardTitle
                    className="text-3xl uppercase leading-none"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {overlay.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="grid gap-4">
                  <p className="text-sm leading-7 text-[var(--color-accent-ink-soft)] sm:text-base">
                    {overlay.description}
                  </p>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="card-brutal-static bg-[var(--color-paper)] p-4">
                      <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
                        URL do OBS
                      </p>
                      <p className="mt-2 break-all text-sm font-black text-[var(--color-ink)]">
                        {overlay.liveHref}
                      </p>
                    </div>
                    <div className="card-brutal-static bg-[var(--color-paper)] p-4">
                      <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
                        Demo visual
                      </p>
                      <p className="mt-2 break-all text-sm font-black text-[var(--color-ink)]">
                        {overlay.demoHref}
                      </p>
                    </div>
                    <div className="card-brutal-static bg-[var(--color-paper)] p-4">
                      <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
                        Feed JSON
                      </p>
                      <p className="mt-2 break-all text-sm font-black text-[var(--color-ink)]">
                        {overlay.apiHref}
                      </p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-wrap items-center gap-3">
                  <Link href={overlay.liveHref} className="btn-brutal ink-button px-4 py-2 text-xs">
                    Abrir overlay
                  </Link>
                  <Link href={overlay.demoHref} className="btn-brutal accent-button px-4 py-2 text-xs">
                    Abrir demo
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
