import type { ReactNode } from "react";
import Link from "next/link";

import { auth } from "@/auth";
import { AuthButtons } from "@/components/auth-buttons";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { QuickNavGrid } from "@/components/quick-nav-grid";
import { StickerBadge } from "@/components/sticker-badge";
import { env } from "@/lib/env";
import { getCatalog, getLeaderboard, getViewerDashboard, listBets } from "@/lib/db/repository";
import type { BetWithOptionsRecord, CatalogItemRecord } from "@/lib/types";
import { formatPipetz } from "@/lib/utils";

type HomeMetric = {
  label: string;
  value: string;
  note: string;
  bg: string;
};

type SpotlightProps = {
  activeBet: BetWithOptionsRecord | undefined;
  catalog: CatalogItemRecord[];
  loggedIn?: boolean;
};

type FeatureCard = {
  symbol: string;
  eyebrow: string;
  title: string;
  body: string;
  bg: string;
};

const DEFAULT_GITHUB_ISSUES_URL =
  "https://github.com/ludmila-omlopes/ludylops-youtube-dashboard/issues/new";

function buildYoutubeLinkingIssueUrl(input: {
  status: NonNullable<
    NonNullable<Awaited<ReturnType<typeof auth>>["user"]>["youtubeLinkingStatus"]
  >;
  message: string;
  isLinked: boolean;
  hasActiveViewer: boolean;
}) {
  const title = "[Linking] Google login sem canal do YouTube confirmado";
  const body = [
    "## O que aconteceu",
    "O login Google entrou, mas o app nao conseguiu confirmar o canal do YouTube automaticamente.",
    "",
    "## Diagnostico tecnico",
    `- youtubeLinkingStatus: \`${input.status}\``,
    `- mensagem exibida: ${input.message}`,
    `- hasActiveViewer: ${input.hasActiveViewer ? "yes" : "no"}`,
    `- isLinked: ${input.isLinked ? "yes" : "no"}`,
    `- horario (UTC): ${new Date().toISOString()}`,
    "",
    "## O que eu esperava",
    "- Descreva qual canal do YouTube deveria ter sido vinculado.",
    "",
    "## Observacoes",
    "- Nao inclua token, email privado, cookie nem segredo nesta issue.",
  ].join("\n");

  const url = new URL(env.NEXT_PUBLIC_GITHUB_ISSUES_URL ?? DEFAULT_GITHUB_ISSUES_URL);
  url.searchParams.set("title", title);
  url.searchParams.set("body", body);
  return url.toString();
}

function YoutubeLinkingNotice({
  status,
  message,
  issueUrl,
}: {
  status: NonNullable<
    NonNullable<Awaited<ReturnType<typeof auth>>["user"]>["youtubeLinkingStatus"]
  >;
  message: string;
  issueUrl: string;
}) {
  const title =
    status === "empty"
      ? "Nao encontrei nenhum canal do YouTube nesta conta."
      : status === "scope_missing"
        ? "O login Google entrou sem permissao para consultar seu canal."
        : "Nao consegui confirmar seu canal do YouTube nesta tentativa.";

  return (
    <div className="card-poster mt-6 border-[3px] border-[var(--color-ink)] bg-[var(--color-pink)] p-4 text-[var(--color-accent-ink)]">
      <p className="mono text-[10px] uppercase tracking-[0.24em]">linking google/youtube</p>
      <p className="mt-2 text-lg font-black uppercase leading-tight">{title}</p>
      <p className="mt-3 text-sm font-bold leading-6">{message}</p>
      <p className="mt-3 text-xs font-medium leading-5">
        Por seguranca, eu nao criei nem troquei automaticamente o viewer desta sessao enquanto esse
        diagnostico nao for resolvido.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={issueUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-brutal bg-[var(--color-paper)] px-4 py-2 text-xs text-[var(--color-ink)]"
        >
          Abrir issue no GitHub →
        </a>
      </div>
    </div>
  );
}

function HeroPoster({
  badge,
  heading,
  description,
  metrics,
}: {
  badge: string;
  heading: string;
  description: string;
  metrics: HomeMetric[];
}) {
  const rotations = ["rotate-[-2deg]", "rotate-[1.5deg]", "rotate-[-1deg]"];

  return (
    <div className="relative min-h-[420px]">
      <div className="card-brutal absolute left-0 top-8 hidden h-16 w-16 items-center justify-center bg-[var(--color-blue)] text-lg font-black lg:flex">
        {"</>"}
      </div>
      <div className="retro-label absolute -right-2 top-0 z-20 hidden bg-[var(--color-pink)] text-[var(--color-accent-ink)] lg:inline-flex">
        {badge}
      </div>
      <StickerBadge
        variant="star"
        className="absolute -right-2 bottom-4 hidden h-20 w-20 rotate-[10deg] lg:inline-flex"
        label="decorative star"
      />
      <StickerBadge
        variant="flower"
        className="absolute right-14 top-14 hidden h-16 w-16 rotate-[-12deg] lg:inline-flex"
        label="decorative flower"
      />

      <div className="panel relative z-10 mt-10 bg-[var(--color-paper)] p-6 lg:ml-10 lg:mt-12 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="retro-label accent-chip">oi, eu sou a ludylops</span>
          <span className="retro-label accent-chip-strong">chat em movimento</span>
        </div>

        <div className="mt-8">
          <p className="mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-ink-soft)]">
            painel da live . pontos . apostas . resgates
          </p>
          <h2
            className="mt-3 text-4xl uppercase leading-[0.88] sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {heading}
          </h2>
          <p className="mt-4 max-w-md text-sm font-medium leading-7 text-[var(--color-ink-soft)] sm:text-base">
            {description}
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {metrics.slice(0, 4).map((metric, index) => (
            <article
              key={metric.label}
              className={`card-poster p-4 ${metric.bg} ${rotations[index % rotations.length]}`}
            >
              <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
                {metric.label}
              </p>
              <p
                className="mt-2 text-3xl uppercase leading-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {metric.value}
              </p>
              <p className="mt-2 text-sm font-bold leading-6 text-[var(--color-ink-soft)]">
                {metric.note}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureShowcase({
  features,
  metrics,
  loggedIn = false,
}: {
  features: FeatureCard[];
  metrics: HomeMetric[];
  loggedIn?: boolean;
}) {
  const metricRotations = ["rotate-[1deg]", "rotate-[-1deg]", "rotate-[1.5deg]", "rotate-[-1.5deg]"];

  return (
    <section className="panel surface-section p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="retro-label accent-chip">o que rola por aqui</span>
          <h2
            className="mt-4 max-w-xl text-4xl uppercase leading-[0.9] sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Voce participa da minha live de verdade.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--color-ink-soft)]">
            Eu abro a live, voce junta pipetz, entra nas apostas e ainda solta resgates
            que aparecem comigo ao vivo.
          </p>

          <div className="mt-8 space-y-4">
            {features.map((feature) => (
              <article key={feature.title} className={`card-poster flex gap-4 p-4 sm:p-5 ${feature.bg}`}>
                <div className="card-brutal flex h-14 w-14 shrink-0 items-center justify-center bg-[var(--color-paper)] text-xl font-black">
                  {feature.symbol}
                </div>
                <div>
                  <p className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
                    {feature.eyebrow}
                  </p>
                  <h3
                    className="mt-2 text-2xl uppercase leading-none"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-ink-soft)]">{feature.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel bg-[var(--color-lavender)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="retro-label accent-chip-strong">termometro da live</span>
            <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
              comunidade agora
            </span>
          </div>

          <h3
            className="mt-5 max-w-md text-3xl uppercase leading-[0.92] sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            O que voces estao aprontando comigo agora.
          </h3>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {metrics.map((metric, index) => (
              <article
                key={metric.label}
                className={`card-poster p-4 ${metric.bg} ${metricRotations[index % metricRotations.length]}`}
              >
                <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
                  {metric.label}
                </p>
                <p
                  className="mt-2 text-3xl uppercase leading-none"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {metric.value}
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-[var(--color-ink-soft)]">
                  {metric.note}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-6">
            <Link
              href={loggedIn ? "/apostas" : "/jogos"}
              className="btn-brutal accent-button px-5 py-3 text-xs"
            >
              {loggedIn ? "Entrar em apostas ↗" : "Explorar a comunidade ↗"}
            </Link>
          </div>
        </div>
      </div>
    </section>
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
  const rowColors = ["bg-[var(--color-blue)]", "bg-[var(--color-purple)]", "bg-[var(--color-pink)]"];

  return (
    <aside className="panel surface-section p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="retro-label accent-chip">ranking drop</span>
        <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
          top da live
        </span>
      </div>

      <h2
        className="mt-5 max-w-[10ch] text-4xl uppercase leading-[0.88] sm:text-5xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Liderando agora
      </h2>

      <div className="mt-6 space-y-4">
        {leaders.map((entry, index) => {
          const viewer = "viewer" in entry ? entry.viewer : entry;
          const balance = "balance" in entry ? entry.balance : entry;

          return (
            <div
              key={viewer.id}
              className={`card-poster flex items-center justify-between gap-3 px-4 py-4 ${rowColors[index]}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="card-brutal flex min-w-[52px] items-center justify-center bg-[var(--color-paper)] px-3 py-2 text-sm font-black">
                  #{index + 1}
                </div>
                <div className="min-w-0">
                  <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
                    viewer
                  </p>
                  <p className="truncate text-base font-black uppercase tracking-[0.04em]">
                    {viewer.youtubeDisplayName}
                  </p>
                </div>
              </div>
              <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
                {formatPipetz(balance.currentBalance)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/ranking" className="btn-brutal ink-button px-5 py-3 text-xs">
          Ver ranking completo →
        </Link>
        {typeof viewerRank === "number" && viewerRank > 0 ? (
          <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
            voce esta em #{viewerRank}
          </span>
        ) : null}
      </div>
    </aside>
  );
}

function LiveSpotlight({ activeBet, catalog, loggedIn = false }: SpotlightProps) {
  if (activeBet) {
    return (
      <section className="panel bg-[var(--color-paper)] p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="retro-label bg-[var(--color-pink)] text-[var(--color-accent-ink)]">
                AO VIVO
              </span>
              <span className="retro-label accent-chip-strong">
                {activeBet.options.length} opcoes abertas
              </span>
            </div>

            <h2
              className="mt-5 max-w-2xl text-4xl uppercase leading-[0.9] sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {activeBet.question}
            </h2>

            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--color-ink-soft)]">
              Quando eu abro uma aposta, voces escolhem um lado, entram no pool e tentam
              adivinhar o que vai acontecer comigo ao vivo.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="retro-label accent-chip-strong">
                pool {formatPipetz(activeBet.totalPool)}
              </span>
              <span className="retro-label accent-chip">
                voces palpitando ao vivo
              </span>
            </div>

            <div className="mt-6">
              <Link href="/apostas" className="btn-brutal accent-button px-5 py-3 text-xs">
                {loggedIn ? "Ir para apostas ↗" : "Ver apostas da live ↗"}
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {activeBet.options.map((option, index) => {
              const colors = [
                "bg-[var(--color-blue)]",
                "bg-[var(--color-purple)]",
                "bg-[var(--color-pink)]",
                "bg-[var(--color-paper)]",
              ];

              return (
                <article
                  key={option.id}
                  className={`card-poster flex items-center justify-between gap-3 px-4 py-4 ${colors[index % colors.length]}`}
                >
                  <div className="min-w-0">
                    <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
                      opcao 0{index + 1}
                    </p>
                    <p className="mt-1 text-lg font-black uppercase leading-tight">{option.label}</p>
                  </div>
                  <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
                    {formatPipetz(option.poolAmount)}
                  </span>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  const featured = catalog.slice(0, 3);
  const colors = ["bg-[var(--color-blue)]", "bg-[var(--color-purple)]", "bg-[var(--color-pink)]"];

  return (
    <section className="panel bg-[var(--color-paper)] p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="retro-label accent-chip">resgates</span>
            <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
              loja da comunidade
            </span>
          </div>

          <h2
            className="mt-5 max-w-xl text-4xl uppercase leading-[0.9] sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Em breve.
          </h2>

          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--color-ink-soft)]">
            Quando nao tem aposta aberta, voces ainda conseguem mexer na live com sons,
            imagens e outras baguncas ao vivo.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="retro-label accent-chip-strong">{catalog.length} itens ativos</span>
            <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
              som . imagem . caos
            </span>
          </div>

          <div className="mt-6">
            <Link href="/resgates" className="btn-brutal ink-button px-5 py-3 text-xs">
              Explorar resgates →
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          {featured.map((item, index) => (
            <article
              key={item.id}
              className={`card-poster flex h-full flex-col justify-between gap-4 p-4 sm:p-5 ${colors[index % colors.length]}`}
            >
              <div>
                <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
                  {item.type.replaceAll("_", " ")}
                </span>
                <h3
                  className="mt-4 text-2xl uppercase leading-none"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {item.name}
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--color-ink-soft)]">
                  {item.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
                  resgate instantaneo
                </span>
                <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
                  {formatPipetz(item.cost)}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCallout({ loggedIn = false }: { loggedIn?: boolean }) {
  return (
    <section className="panel bg-[var(--color-blue)] px-6 py-6 sm:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
            vem pra minha live
          </span>
          <h2
            className="mt-4 max-w-2xl text-4xl uppercase leading-[0.9] sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {loggedIn
              ? "Voce ja esta por aqui. Agora e entrar na brincadeira comigo."
              : "Oi, eu sou a ludylops. Entra com sua conta e vem participar da minha live."}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/ranking" className="btn-brutal bg-[var(--color-paper)] px-5 py-3 text-xs text-[var(--color-ink)]">
            Ver ranking →
          </Link>
          <Link
            href={loggedIn ? "/resgates" : "/jogos"}
            className="btn-brutal bg-[var(--color-pink)] px-5 py-3 text-xs text-[var(--color-accent-ink)]"
          >
            {loggedIn ? "Gastar pipetz ↗" : "Entrar pela comunidade ↗"}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default async function Home() {
  const session = await auth();
  const activeViewerId = session?.user?.activeViewerId ?? null;
  const [catalog, leaderboard, bets] = await Promise.all([
    getCatalog(),
    getLeaderboard(),
    listBets(activeViewerId),
  ]);
  const activeBets = bets.filter((bet) => bet.status === "open");

  let dashboard: Awaited<ReturnType<typeof getViewerDashboard>> | null = null;
  if (activeViewerId) {
    dashboard = await getViewerDashboard(activeViewerId);
  }

  const viewerRank = dashboard
    ? leaderboard.findIndex((entry) => {
        const viewer = "viewer" in entry ? entry.viewer : entry;
        return viewer.id === dashboard!.viewer.id;
      }) + 1
    : null;

  const publicMetrics: HomeMetric[] = [
    {
      label: "resgates",
      value: `${catalog.length}`,
      note: "efeitos que entram na live",
      bg: "bg-[var(--color-blue)]",
    },
    {
      label: "apostas",
      value: `${activeBets.length}`,
      note: "pools abertos para entrar",
      bg: "bg-[var(--color-pink)]",
    },
    {
      label: "viewers",
      value: `${leaderboard.length}`,
      note: "comunidade empilhando pipetz",
      bg: "bg-[var(--color-purple)]",
    },
    {
      label: "comunidade",
      value: "24/7",
      note: "ritmo constante de live",
      bg: "bg-[var(--color-mint)]",
    },
  ];

  const authedMetrics: HomeMetric[] = [
    {
      label: "saldo atual",
      value: dashboard ? formatPipetz(dashboard.balance.currentBalance) : "--",
      note: "pronto para apostar e resgatar",
      bg: "bg-[var(--color-purple)]",
    },
    {
      label: "seu ranking",
      value: viewerRank ? `#${viewerRank}` : "--",
      note: viewerRank ? "posicao atual na disputa" : "sincronize sua conta",
      bg: "bg-[var(--color-blue)]",
    },
    {
      label: "ganhos",
      value: dashboard ? formatPipetz(dashboard.balance.lifetimeEarned) : "--",
      note: "pipetz que ja passaram pela conta",
      bg: "bg-[var(--color-pink)]",
    },
    {
      label: "resgates",
      value: `${catalog.length}`,
      note: "atalhos para agir agora",
      bg: "bg-[var(--color-mint)]",
    },
  ];

  const features: FeatureCard[] = [
    {
      symbol: "⚡",
      eyebrow: "assistindo a live",
      title: "Ganhe assistindo",
      body: "Enquanto voce assiste a minha live, seus pipetz vao acumulando para apostar, resgatar e entrar no ranking.",
      bg: "bg-[var(--color-blue)]",
    },
    {
      symbol: "▣",
      eyebrow: "palpite do chat",
      title: "Aposte ao vivo",
      body: "Quando eu abrir uma aposta, escolhe seu lado e vem ver se o chat me conhece mesmo.",
      bg: "bg-[var(--color-purple)]",
    },
    {
      symbol: "↗",
      eyebrow: "bagunca organizada",
      title: "Acione resgates",
      body: "Se quiser me trollar com carinho, os resgates viram efeitos e caos ao vivo na stream.",
      bg: "bg-[var(--color-pink)]",
    },
  ];

  const heroTitle: ReactNode = session?.user ? (
    <>
      Voce ja esta na minha live.{" "}
      <span className="inline-block border-[3px] border-[var(--color-ink)] bg-[var(--color-pink)] px-3 py-1 shadow-[4px_4px_0_#000]">
        Agora vem jogar comigo.
      </span>
    </>
  ) : (
    <>
      Oi, eu sou a ludylops.{" "}
      <span className="inline-block border-[3px] border-[var(--color-ink)] bg-[var(--color-pink)] px-3 py-1 shadow-[4px_4px_0_#000]">
        Bem-vindos á minha live.
      </span>
    </>
  );

  const heroDescription = session?.user
    ? dashboard
      ? "Seu saldo, seu ranking e o que esta rolando comigo ao vivo ficam aqui para voce entrar na brincadeira sem se perder."
      : "Sua conta entrou, mas ainda falta sincronizar seus dados da live para eu te liberar tudo por aqui."
    : "Aqui o chat ganha pipetz, entra nas apostas e ativa resgates que aparecem durante a minha live.";

  const heroPosterHeading = session?.user
    ? dashboard?.viewer.youtubeDisplayName ?? "Conta conectada"
    : "LUDYLOPS";

  const heroPosterDescription = session?.user
    ? "Esse e o seu cantinho para acompanhar saldo, ranking e o que esta rolando comigo ao vivo."
    : "Esse painel e o cantinho da minha live para o chat apostar, resgatar e acompanhar o ranking.";

  const metrics = session?.user ? authedMetrics : publicMetrics;
  const shouldShowYoutubeLinkingNotice = Boolean(
    session?.user?.youtubeLinkingMessage &&
      session.user.youtubeLinkingStatus &&
      session.user.youtubeLinkingStatus !== "channels_found" &&
      !session.user.isLinked,
  );
  const youtubeLinkingIssueUrl =
    shouldShowYoutubeLinkingNotice && session?.user?.youtubeLinkingStatus && session.user.youtubeLinkingMessage
      ? buildYoutubeLinkingIssueUrl({
          status: session.user.youtubeLinkingStatus,
          message: session.user.youtubeLinkingMessage,
          isLinked: Boolean(session.user.isLinked),
          hasActiveViewer: Boolean(session.user.activeViewerId),
        })
      : null;

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 lg:px-10">
      <section className="panel surface-hero relative p-6 sm:p-8 lg:p-10">
        <div className="bg-micro-grid pointer-events-none absolute inset-0 opacity-30" />
        <StickerBadge
          variant="bolt"
          className="absolute right-4 top-4 hidden h-16 w-16 rotate-[8deg] lg:inline-flex"
          label="decorative bolt"
        />
        <StickerBadge
          variant="heart"
          className="absolute bottom-4 left-[46%] hidden h-16 w-16 rotate-[-12deg] lg:inline-flex"
          label="decorative heart"
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="retro-label accent-chip-strong">PIPETZ / minha live</span>
              <span className="retro-label bg-[var(--color-paper)] text-[var(--color-ink)]">
                chat, apostas e resgates
              </span>
            </div>

            <p className="mono mt-6 text-[11px] uppercase tracking-[0.36em] text-[var(--color-ink-soft)]">
              pontos . apostas . resgates . comunidade ao vivo
            </p>

            <h1
              className="mt-5 max-w-4xl text-5xl leading-[0.9] sm:text-6xl lg:text-[5.5rem]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {heroTitle}
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--color-ink-soft)] sm:text-lg">
              {heroDescription}
            </p>

            {shouldShowYoutubeLinkingNotice ? (
              <YoutubeLinkingNotice
                status={session!.user!.youtubeLinkingStatus!}
                message={session!.user!.youtubeLinkingMessage!}
                issueUrl={youtubeLinkingIssueUrl!}
              />
            ) : null}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {session?.user ? (
                <>
                  <Link href="/apostas" className="btn-brutal accent-button px-6 py-3 text-sm">
                    Ir para apostas ↗
                  </Link>
                  <Link href="/ranking" className="btn-brutal ink-button px-6 py-3 text-sm">
                    Ver ranking →
                  </Link>
                </>
              ) : (
                <>
                  <AuthButtons showGoogleHint />
                  <Link href="/ranking" className="btn-brutal accent-button px-6 py-3 text-sm">
                    Ver ranking →
                  </Link>
                </>
              )}
            </div>

            <p className="mt-4 text-sm font-medium leading-6 text-[var(--color-ink-soft)]">
              Ao usar o login Google, voce pode revisar nossa{" "}
              <Link href="/privacy" className="font-black underline decoration-[3px] underline-offset-4">
                Politica de Privacidade
              </Link>
              .
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="retro-label bg-[var(--color-pink)] text-[var(--color-accent-ink)]">
                pontos na live
              </span>
              <span className="retro-label bg-[var(--color-blue)] text-[var(--color-accent-ink)]">
                apostas abertas
              </span>
              <span className="retro-label accent-chip">efeitos ao vivo</span>
            </div>
          </div>

          <HeroPoster
            badge="feito pra voces"
            heading={heroPosterHeading}
            description={heroPosterDescription}
            metrics={metrics}
          />
        </div>
      </section>

      <FeatureShowcase features={features} metrics={metrics} loggedIn={Boolean(session?.user)} />

      {session?.user ? (
        <QuickNavGrid
          items={[
            {
              href: "/resgates",
              label: "Resgates",
              value: `${catalog.length} itens`,
              sublabel: "Bagunce a minha live",
              emoji: "SHOP",
              bg: "bg-[var(--color-purple)]",
            },
            {
              href: "/apostas",
              label: "Apostas",
              value: `${activeBets.length} abertas`,
              sublabel: "Palpite no que eu vou fazer",
              emoji: "LIVE",
              bg: "bg-[var(--color-pink)]",
            },
            {
              href: "/jogos",
              label: "Jogos",
              value: "Sugira proximos",
              sublabel: "Me empurre pro proximo caos",
              emoji: "PLAY",
              bg: "bg-[var(--color-blue)]",
            },
            {
              href: "/ranking",
              label: "Ranking",
              value: viewerRank ? `#${viewerRank}` : "--",
              sublabel: "Veja onde voce esta",
              emoji: "TOP",
              bg: "bg-[var(--color-mint)]",
            },
          ]}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <RankingHeroCard leaderboard={leaderboard} viewerRank={viewerRank} />
        <LiveSpotlight activeBet={activeBets[0]} catalog={catalog} loggedIn={Boolean(session?.user)} />
      </div>

      {session?.user ? (
        <section className="panel surface-section p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="retro-label accent-chip">ranking resumido</span>
              <h2
                className="mt-4 text-3xl uppercase leading-none sm:text-4xl"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Seu lugar no ranking
              </h2>
            </div>
            <Link href="/ranking" className="btn-brutal ink-button px-5 py-3 text-xs">
              Ver tudo →
            </Link>
          </div>
          <div className="mt-6">
            <LeaderboardTable entries={leaderboard.slice(0, 5)} compact />
          </div>
        </section>
      ) : null}

      <FinalCallout loggedIn={Boolean(session?.user)} />
    </div>
  );
}
