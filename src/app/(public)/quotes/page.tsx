import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listQuotes } from "@/lib/db/repository";
import { formatDateTime } from "@/lib/utils";

const quoteCardBackgrounds = [
  "bg-[var(--color-paper)]",
  "bg-[var(--color-pink)]",
  "bg-[var(--color-blue)]",
  "bg-[var(--color-mint)]",
];

export default async function QuotesPage() {
  const quotes = await listQuotes();
  const latestQuote = quotes[0] ?? null;

  return (
    <div className="flex w-full flex-col pb-20 pt-8">
      <section className="landing-plane surface-hero relative overflow-hidden py-8 sm:py-10">
        <div className="bg-dots-light pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative mx-auto flex w-full max-w-[1500px] items-start justify-between gap-4 px-4 sm:px-6 lg:px-10">
          <div>
            <p className="mono text-xs font-bold uppercase tracking-[0.32em] text-[var(--color-ink-soft)]">
              Quotes da live
            </p>
            <h1
              className="mt-3 text-4xl uppercase sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Todas as frases registradas.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-ink-soft)] sm:text-base">
              Aqui ficam as melhores perolas salvas pelo chat. Tudo em ordem de cadastro, com o
              numero da quote e quem registrou.
            </p>
          </div>
          <div className="sticker hidden accent-chip-strong px-4 py-2 text-sm sm:inline-flex">
            {quotes.length} quotes
          </div>
        </div>
      </section>

      <section className="landing-plane landing-divider bg-[var(--color-paper-pink)] py-8 sm:py-10">
        <div className="mx-auto grid w-full max-w-[1500px] gap-6 px-4 sm:px-6 lg:grid-cols-[0.7fr_1fr] lg:px-10">
          <Card variant="poster" className="h-fit bg-[var(--color-yellow)] p-5">
            <CardHeader className="gap-2">
              <CardDescription className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
                Ultima quote salva
              </CardDescription>
              <CardTitle
                className="text-3xl uppercase leading-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {latestQuote ? `#${latestQuote.quoteNumber}` : "Sem quotes"}
              </CardTitle>
            </CardHeader>
            <CardContent className="mt-4">
              <p className="text-lg font-black leading-8 text-[var(--color-ink)]">
                {latestQuote ? `"${latestQuote.body}"` : "Ainda nao tem nenhuma quote cadastrada."}
              </p>
            </CardContent>
            <CardFooter className="mt-5 flex-col items-start gap-1 text-sm font-bold text-[var(--color-ink-soft)]">
              <span>
                {latestQuote
                  ? `Salva por ${latestQuote.createdByDisplayName}`
                  : "Manda uma do chat para estrear essa pagina."}
              </span>
              {latestQuote ? (
                <span>{formatDateTime(latestQuote.createdAt)}</span>
              ) : null}
            </CardFooter>
          </Card>

          <div className="grid gap-4">
            {quotes.length > 0 ? (
              quotes.map((quote, index) => (
                <Card
                  key={quote.id}
                  variant="poster"
                  className={`gap-4 p-5 ${quoteCardBackgrounds[index % quoteCardBackgrounds.length]}`}
                >
                  <CardHeader className="flex-row items-start justify-between gap-4">
                    <div>
                      <CardDescription className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
                        Quote registrada
                      </CardDescription>
                      <CardTitle
                        className="mt-2 text-3xl uppercase leading-none"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        #{quote.quoteNumber}
                      </CardTitle>
                    </div>
                    <div className="card-brutal-static bg-[var(--color-paper)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em]">
                      {quote.source.replaceAll("_", " ")}
                    </div>
                  </CardHeader>

                  <CardContent>
                    <blockquote className="text-lg font-black leading-8 text-[var(--color-ink)] sm:text-xl">
                      <span aria-hidden="true">&ldquo;</span>
                      {quote.body}
                      <span aria-hidden="true">&rdquo;</span>
                    </blockquote>
                  </CardContent>

                  <CardFooter className="flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-[var(--color-ink-soft)]">
                    <div>
                      <span>{quote.createdByDisplayName}</span>
                      {quote.createdByYoutubeHandle ? ` • ${quote.createdByYoutubeHandle}` : ""}
                    </div>
                    <span>{formatDateTime(quote.createdAt)}</span>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card variant="poster" className="bg-[var(--color-paper)] p-6">
                <CardHeader>
                  <CardDescription className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
                    Lista vazia
                  </CardDescription>
                  <CardTitle
                    className="text-3xl uppercase leading-none"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Nenhuma quote ainda.
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-7 text-[var(--color-ink-soft)] sm:text-base">
                    Quando o chat salvar a primeira quote, ela aparece aqui automaticamente.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
