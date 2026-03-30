import Link from "next/link";

import { auth } from "@/auth";
import { AuthButtons } from "@/components/auth-buttons";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { QuickNavGrid } from "@/components/quick-nav-grid";
import { StickerBadge } from "@/components/sticker-badge";
import { getCatalog, getLeaderboard, getViewerDashboard } from "@/lib/db/repository";
import { demoBets } from "@/lib/demo-data";
import type { CatalogItemRecord } from "@/lib/types";
import { formatPipetz } from "@/lib/utils";

type HomeStat = {
  label: string;
  value: string;
  note: string;
  bg: string;
  shadow: string;
};

type SpotlightProps = {
  activeBet: (typeof demoBets)[number] | undefined;
  catalog: CatalogItemRecord[];
  loggedIn?: boolean;
};

function StatStrip({ items }: { items: HomeStat[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((stat, index) => (
        <article
          key={stat.label}
          className={`card-poster relative overflow-hidden px-4 py-4 sm:px-5 ${stat.bg} ${stat.shadow}`}
        >
          <div className="retro-ribbon absolute right-3 top-3">
            0{index + 1}
          </div>
          <p className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
            {stat.label}
          </p>
          <p
            className="mt-3 text-3xl uppercase leading-none sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {stat.value}
          </p>
          <p className="mt-2 text-sm font-medium text-[var(--color-ink-soft)]">
            {stat.note}
          </p>
        </article>
      ))}
    </div>
  );
}

function RankingHeroCard({
  leaderboard,
  viewerRank,
}: {
  leaderboard: Awaited<ReturnType<typeof getLeaderboard>>;
  viewerRank?: number | null;
}) {
  const leaders = leaderboard.slice(0, 3);

  return (
    <aside className="retro-window panel-soft relative overflow-hidden bg-[var(--color-paper)]">
      <div className="bg-micro-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="retro-window-bar relative flex items-center justify-between gap-3">
        <span className="retro-label bg-[var(--color-yellow)] text-[var(--color-ink)]">
          ranking drop
        </span>
        <span className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
          top da live
        </span>
      </div>
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-1">
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
              ranking ao vivo
            </p>
            <h2
              className="mt-2 max-w-[8ch] text-4xl uppercase leading-[0.88] sm:text-[3.35rem]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Liderando agora
            </h2>
          </div>

          <div className="hidden shrink-0 sm:flex sm:items-start sm:gap-2">
            <StickerBadge
              variant="spark"
              className="h-14 w-14 rotate-[-8deg] self-end"
              label="spark sticker"
            />
            <StickerBadge
              variant="heart"
              className="h-20 w-20 rotate-[8deg]"
              label="heart sticker"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {leaders.map((entry, index) => {
            const viewer = "viewer" in entry ? entry.viewer : entry;
            const balance = "balance" in entry ? entry.balance : entry;
            const rowBg = [
              "bg-[var(--color-yellow)]",
              "bg-[var(--color-paper-pink)]",
              "bg-[var(--color-mint)]",
            ][index];
            const rowShadow = ["shadow-yellow", "shadow-purple", "shadow-blue"][index];

            return (
              <div
                key={viewer.id}
                className={`card-poster flex items-center justify-between gap-3 px-4 py-3.5 ${rowBg} ${rowShadow}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="retro-label min-w-[46px] justify-center bg-[var(--color-paper)] text-[var(--color-ink)]">
                    #{index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold uppercase tracking-[0.05em] text-[var(--color-ink)]">
                      {viewer.youtubeDisplayName}
                    </p>
                  </div>
                </div>
                <div className="retro-label shrink-0 bg-[var(--color-paper)] text-[var(--color-ink)]">
                  {formatPipetz(balance.currentBalance)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/ranking"
            className="btn-brutal w-full bg-[var(--color-yellow)] px-5 py-2.5 text-xs text-[var(--color-ink)] sm:w-auto"
          >
            Ver ranking completo
          </Link>
          {typeof viewerRank === "number" && viewerRank > 0 ? (
            <p className="mono text-[11px] uppercase tracking-[0.22em] text-[var(--color-ink-soft)]">
              voce esta em #{viewerRank}
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function LiveSpotlight({ activeBet, catalog, loggedIn = false }: SpotlightProps) {
  if (activeBet) {
    return (
      <section className="panel-soft relative overflow-hidden bg-[var(--color-paper-pink)] p-6 sm:p-8">
        <div className="bg-halftone pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 opacity-60 lg:block" />
        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="retro-label bg-[var(--color-pink-hot)] text-white">
                AO VIVO
              </span>
              <span className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
                destaque do momento
              </span>
            </div>
            <h2
              className="mt-4 max-w-2xl text-3xl uppercase leading-[0.92] sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {activeBet.question}
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--color-ink-soft)] sm:text-base">
              A comunidade esta apostando em tempo real. Escolha um lado, entra no pool e
              disputa seus pipetz com a galera.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
                pool {formatPipetz(activeBet.totalPool)} pipetz
              </span>
              <span className="retro-label bg-[var(--color-yellow)] text-[var(--color-ink)]">
                {activeBet.options.length} opcoes abertas
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {activeBet.options.map((option, index) => {
              const colors = [
                "bg-[var(--color-lavender)]",
                "bg-[var(--color-sky)]",
                "bg-[var(--color-mint)]",
                "bg-[var(--color-paper)]",
              ];

              return (
                <div
                  key={option.id}
                  className={`card-poster flex items-center justify-between gap-3 px-4 py-4 ${colors[index % colors.length]} shadow-purple`}
                >
                  <div className="min-w-0">
                    <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
                      opcao 0{index + 1}
                    </p>
                    <p className="mt-1 font-bold text-[var(--color-ink)]">
                      {option.label}
                    </p>
                  </div>
                  <span className="retro-label shrink-0 bg-[var(--color-paper)] text-[var(--color-ink)]">
                    {formatPipetz(option.poolAmount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/apostas"
            className="btn-brutal bg-[var(--color-pink)] px-5 py-2.5 text-xs text-[var(--color-ink)]"
          >
            {loggedIn ? "Ir para apostas" : "Ver apostas da live"}
          </Link>
          <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
            dinamica viva, pool coletivo, payoff imediato
          </span>
        </div>
      </section>
    );
  }

  const featured = catalog.slice(0, 3);

  return (
    <section className="panel-soft relative overflow-hidden bg-[var(--color-paper-warm)] p-6 sm:p-8">
      <div className="bg-micro-grid pointer-events-none absolute inset-0 opacity-25" />
      <div className="relative grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="retro-label bg-[var(--color-yellow)] text-[var(--color-ink)]">
              resgates
            </span>
            <span className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
              loja da comunidade
            </span>
          </div>
          <h2
            className="mt-4 max-w-xl text-3xl uppercase leading-[0.92] sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Troque pipetz por caos aprovado na live.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--color-ink-soft)] sm:text-base">
            Quando nao ha aposta rolando, a home puxa a atencao para o catalogo de sons,
            imagens e efeitos que movimentam a stream em tempo real.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
              {catalog.length} itens no catalogo
            </span>
            <span className="retro-label bg-[var(--color-lavender)] text-[var(--color-ink)]">
              som, overlay e imagem
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {featured.map((item, index) => {
            const colors = [
              "bg-[var(--color-lavender)]",
              "bg-[var(--color-sky)]",
              "bg-[var(--color-rose)]",
            ];

            return (
              <article
                key={item.id}
                className={`card-poster flex h-full flex-col justify-between gap-4 px-4 py-4 ${colors[index % colors.length]} shadow-blue`}
              >
                <div>
                  <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
                    {item.type.replaceAll("_", " ")}
                  </span>
                  <h3
                    className="mt-3 text-2xl uppercase leading-none"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {item.name}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-ink-soft)]">
                    {item.description}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
                    resgate instantaneo
                  </span>
                  <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
                    {formatPipetz(item.cost)}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="relative mt-6">
        <Link
          href="/resgates"
          className="btn-brutal bg-[var(--color-blue)] px-5 py-2.5 text-xs text-[var(--color-ink)]"
        >
          Explorar resgates
        </Link>
      </div>
    </section>
  );
}

function FinalCallout({ loggedIn = false }: { loggedIn?: boolean }) {
  return (
    <section className="panel-soft bg-[var(--color-lavender)] px-6 py-6 sm:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
            ganhar . competir . resgatar
          </span>
          <h2
            className="mt-4 max-w-2xl text-3xl uppercase leading-[0.92] sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {loggedIn
              ? "Sua conta ja esta no jogo. Agora e usar os pipetz com estrategia."
              : "Entra na conta, acumula pipetz e aparece no topo quando a live comecar."}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/ranking"
            className="btn-brutal bg-[var(--color-paper)] px-5 py-2.5 text-xs text-[var(--color-ink)]"
          >
            Ver ranking
          </Link>
          <Link
            href={loggedIn ? "/resgates" : "/jogos"}
            className="btn-brutal bg-[var(--color-yellow)] px-5 py-2.5 text-xs text-[var(--color-ink)]"
          >
            {loggedIn ? "Gastar pipetz" : "Entrar pela comunidade"}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default async function Home() {
  const session = await auth();
  const [catalog, leaderboard] = await Promise.all([getCatalog(), getLeaderboard()]);
  const activeBets = demoBets.filter((bet) => bet.status === "open");

  let dashboard: Awaited<ReturnType<typeof getViewerDashboard>> | null = null;
  if (session?.user?.email) {
    dashboard = await getViewerDashboard(session.user.email);
  }

  const viewerRank = dashboard
    ? leaderboard.findIndex((entry) => {
        const viewer = "viewer" in entry ? entry.viewer : entry;
        return viewer.id === dashboard!.viewer.id;
      }) + 1
    : null;

  const publicStats: HomeStat[] = [
    {
      label: "resgates",
      value: `${catalog.length}`,
      note: "itens para acionar na live",
      bg: "bg-[var(--color-sky)]",
      shadow: "shadow-blue",
    },
    {
      label: "apostas ativas",
      value: `${activeBets.length}`,
      note: "desafios abertos agora",
      bg: "bg-[var(--color-rose)]",
      shadow: "shadow-pink",
    },
    {
      label: "viewers",
      value: `${leaderboard.length}`,
      note: "gente acumulando pipetz",
      bg: "bg-[var(--color-mint)]",
      shadow: "shadow-blue",
    },
    {
      label: "comunidade",
      value: "24/7",
      note: "live, caos e participacao",
      bg: "bg-[var(--color-yellow)]",
      shadow: "shadow-yellow",
    },
  ];

  const authedStats: HomeStat[] = [
    {
      label: "saldo atual",
      value: dashboard ? formatPipetz(dashboard.balance.currentBalance) : "--",
      note: "pronto para apostar e resgatar",
      bg: "bg-[var(--color-sky)]",
      shadow: "shadow-blue",
    },
    {
      label: "seu ranking",
      value: viewerRank ? `#${viewerRank}` : "--",
      note: viewerRank ? "posicao da semana" : "sincronize para entrar",
      bg: "bg-[var(--color-yellow)]",
      shadow: "shadow-yellow",
    },
    {
      label: "ganhos",
      value: dashboard ? formatPipetz(dashboard.balance.lifetimeEarned) : "--",
      note: "pipetz que ja passaram pela conta",
      bg: "bg-[var(--color-mint)]",
      shadow: "shadow-purple",
    },
    {
      label: "resgates",
      value: `${catalog.length}`,
      note: "atalhos para gastar agora",
      bg: "bg-[var(--color-rose)]",
      shadow: "shadow-pink",
    },
  ];

  if (!session?.user) {
    return (
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 lg:px-10">
        <section className="panel relative overflow-hidden bg-[var(--color-paper-warm)] p-5 sm:p-8 lg:p-10">
          <div className="bg-micro-grid pointer-events-none absolute inset-0 opacity-25" />
          <div className="bg-halftone pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 opacity-70 lg:block" />
          <StickerBadge
            variant="heart"
            className="absolute bottom-5 right-6 hidden h-16 w-16 rotate-[10deg] lg:inline-flex"
            label="heart sticker"
          />
          <StickerBadge
            variant="bolt"
            className="absolute right-28 top-7 hidden h-14 w-14 rotate-[12deg] lg:inline-flex"
            label="bolt sticker"
          />
          <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <span className="meta-pill bg-[var(--color-yellow)] text-[var(--color-ink)]">
                  sistema de pontos da live
                </span>
              </div>

              <p className="mono mt-6 text-[11px] uppercase tracking-[0.38em] text-[var(--color-ink-soft)]">
                ganhe assistindo . suba no ranking . resgate ao vivo
              </p>

              <h1
                className="mt-4 text-6xl uppercase leading-[0.84] text-[var(--color-ink)] sm:text-7xl lg:text-[7rem]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Pipetz
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-[var(--color-ink-soft)] sm:text-lg">
                Ganhe pipetz assistindo a live, entre nas apostas e troque seus pontos por
                efeitos que entram na stream em tempo real.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <AuthButtons />
                <Link
                  href="/ranking"
                  className="btn-brutal bg-[var(--color-paper)] px-5 py-2.5 text-xs text-[var(--color-ink)]"
                >
                  Ver ranking
                </Link>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <span className="meta-pill meta-pill-soft bg-[var(--color-lavender)] text-[var(--color-ink)]">
                  ganhe assistindo
                </span>
                <span className="meta-pill meta-pill-soft bg-[var(--color-sky)] text-[var(--color-ink)]">
                  aposte ao vivo
                </span>
                <span className="meta-pill meta-pill-soft bg-[var(--color-paper)] text-[var(--color-ink)]">
                  resgate efeitos
                </span>
              </div>
            </div>

            <RankingHeroCard leaderboard={leaderboard} />
          </div>
        </section>

        <StatStrip items={publicStats} />

        <LiveSpotlight activeBet={activeBets[0]} catalog={catalog} />

        <FinalCallout />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 lg:px-10">
      <section className="panel relative overflow-hidden bg-[var(--color-paper-warm)] p-5 sm:p-8 lg:p-10">
        <div className="bg-micro-grid pointer-events-none absolute inset-0 opacity-20" />
        <div className="bg-halftone pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 opacity-60 lg:block" />
        <StickerBadge
          variant="burst"
          className="absolute bottom-5 right-6 hidden h-[4.5rem] w-[4.5rem] rotate-[10deg] lg:inline-flex"
          label="top sticker"
        />
        <StickerBadge
          variant="star"
          className="absolute right-28 top-7 hidden h-14 w-14 rotate-[-10deg] lg:inline-flex"
          label="star sticker"
        />
        <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="retro-label bg-[var(--color-mint)] text-[var(--color-ink)]">
                viewer conectado
              </span>
              <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
                seu painel de entrada
              </span>
            </div>

            <p className="mono mt-6 text-[11px] uppercase tracking-[0.38em] text-[var(--color-ink-soft)]">
              saldo, ranking e atalhos para agir na live
            </p>

            <h1
              className="mt-4 text-4xl uppercase leading-[0.9] text-[var(--color-ink)] sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {dashboard ? dashboard.viewer.youtubeDisplayName : "Sua conta ja entrou no jogo"}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--color-ink-soft)]">
              {dashboard
                ? "Seu saldo ja esta pronto para entrar em apostas, acionar resgates e disputar espaco no topo."
                : "A autenticacao esta ativa, mas seu perfil ainda nao sincronizou com a live para puxar saldo e ranking."}
            </p>

            <div className="mt-7 flex flex-wrap items-end gap-4">
              <div className="card-poster bg-[var(--color-paper)] px-5 py-4 shadow-purple">
                <p className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
                  saldo atual
                </p>
                <p
                  className="mt-2 text-4xl uppercase text-[var(--color-purple-bold)] sm:text-5xl"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {dashboard ? formatPipetz(dashboard.balance.currentBalance) : "--"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <span className="retro-label bg-[var(--color-yellow)] text-[var(--color-ink)]">
                  {viewerRank ? `ranking #${viewerRank}` : "aguardando ranking"}
                </span>
                <span className="retro-label bg-[var(--color-sky)] text-[var(--color-ink)]">
                  {activeBets.length} apostas abertas
                </span>
              </div>
            </div>
          </div>

          <RankingHeroCard leaderboard={leaderboard} viewerRank={viewerRank} />
        </div>
      </section>

      <StatStrip items={authedStats} />

      <QuickNavGrid
        items={[
          {
            href: "/resgates",
            label: "Resgates",
            value: `${catalog.length} itens`,
            sublabel: "Acione a loja da live",
            emoji: "SHOP",
            bg: "bg-[var(--color-lavender)]",
            shadow: "shadow-purple",
          },
          {
            href: "/apostas",
            label: "Apostas",
            value: `${activeBets.length} abertas`,
            sublabel: "Entre no pool atual",
            emoji: "LIVE",
            bg: "bg-[var(--color-rose)]",
            shadow: "shadow-pink",
          },
          {
            href: "/jogos",
            label: "Jogos",
            value: "Sugira proximos",
            sublabel: "Empurre a pauta da stream",
            emoji: "PLAY",
            bg: "bg-[var(--color-sky)]",
            shadow: "shadow-blue",
          },
          {
            href: "/ranking",
            label: "Ranking",
            value: viewerRank ? `#${viewerRank}` : "--",
            sublabel: "Veja onde voce esta",
            emoji: "TOP",
            bg: "bg-[var(--color-yellow)]",
            shadow: "shadow-yellow",
          },
        ]}
      />

      <LiveSpotlight activeBet={activeBets[0]} catalog={catalog} loggedIn />

      <section className="panel-soft bg-[var(--color-paper)] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
              ranking resumido
            </p>
            <h2
              className="mt-2 text-2xl uppercase sm:text-3xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sua referencia competitiva
            </h2>
          </div>
          <Link
            href="/ranking"
            className="btn-brutal bg-[var(--color-yellow)] px-4 py-2 text-xs text-[var(--color-ink)]"
          >
            Ver tudo
          </Link>
        </div>
        <div className="mt-5">
          <LeaderboardTable entries={leaderboard.slice(0, 5)} compact />
        </div>
      </section>

      <FinalCallout loggedIn />
    </div>
  );
}
