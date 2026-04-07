import type { ReactNode } from "react";
import Link from "next/link";

import { auth } from "@/auth";
import { AuthButtons } from "@/components/auth-buttons";
import { QuickNavGrid } from "@/components/quick-nav-grid";
import { StickerBadge } from "@/components/sticker-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCatalog, getLeaderboard, getViewerDashboard, listBets } from "@/lib/db/repository";
import type { BetWithOptionsRecord, CatalogItemRecord } from "@/lib/types";
import { cn, formatPipetz } from "@/lib/utils";

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

function MetricCard({ metric, className }: { metric: HomeMetric; className?: string }) {
  return (
    <Card variant="poster" className={cn("p-4", metric.bg, className)}>
      <CardHeader className="gap-0">
        <CardDescription className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
          {metric.label}
        </CardDescription>
        <CardTitle
          className="mt-2 text-3xl uppercase leading-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {metric.value}
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-2">
        <p className="text-sm font-bold leading-6 text-[var(--color-ink-soft)]">{metric.note}</p>
      </CardContent>
    </Card>
  );
}

function FeatureStoryCard({ feature }: { feature: FeatureCard }) {
  return (
    <Card variant="poster" className={`flex-row gap-4 p-4 sm:p-5 ${feature.bg}`}>
      <CardContent className="flex h-14 w-14 shrink-0 items-center justify-center">
        <div className="card-brutal flex h-14 w-14 items-center justify-center bg-[var(--color-paper)] text-xl font-black">
          {feature.symbol}
        </div>
      </CardContent>
      <CardHeader className="gap-0">
        <CardDescription className="mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
          {feature.eyebrow}
        </CardDescription>
        <CardTitle
          className="mt-2 text-2xl uppercase leading-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {feature.title}
        </CardTitle>
        <CardContent className="mt-3">
          <p className="text-sm leading-6 text-[var(--color-ink-soft)]">{feature.body}</p>
        </CardContent>
      </CardHeader>
    </Card>
  );
}

function RankingLeaderCard({
  index,
  bgClass,
  viewerName,
  balance,
}: {
  index: number;
  bgClass: string;
  viewerName: string;
  balance: number;
}) {
  return (
    <Card variant="poster" className={`flex-row items-center justify-between gap-3 px-4 py-4 ${bgClass}`}>
      <CardContent className="flex min-w-0 items-center gap-3">
        <div className="card-brutal flex min-w-[52px] items-center justify-center bg-[var(--color-paper)] px-3 py-2 text-sm font-black">
          #{index + 1}
        </div>
        <CardHeader className="min-w-0 gap-0">
          <CardDescription className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
            viewer
          </CardDescription>
          <CardTitle className="truncate text-base font-black uppercase tracking-[0.04em]">
            {viewerName}
          </CardTitle>
        </CardHeader>
      </CardContent>
      <CardFooter className="shrink-0">
        <span className="mono text-xs font-black uppercase tracking-[0.18em] text-[var(--color-ink)]">
          {formatPipetz(balance)}
        </span>
      </CardFooter>
    </Card>
  );
}

function SpotlightOptionCard({
  optionLabel,
  poolAmount,
  index,
}: {
  optionLabel: string;
  poolAmount: number;
  index: number;
}) {
  const colors = [
    "bg-[var(--color-blue)]",
    "bg-[var(--color-purple)]",
    "bg-[var(--color-pink)]",
    "bg-[var(--color-paper)]",
  ];

  return (
    <Card
      variant="poster"
      className={`flex-row items-center justify-between gap-3 px-4 py-4 ${colors[index % colors.length]}`}
    >
      <CardHeader className="min-w-0 gap-0">
        <CardDescription className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
          opcao 0{index + 1}
        </CardDescription>
        <CardTitle className="mt-1 text-lg font-black uppercase leading-tight">{optionLabel}</CardTitle>
      </CardHeader>
      <CardFooter className="shrink-0">
        <span className="mono text-xs font-black uppercase tracking-[0.18em] text-[var(--color-ink)]">
          {formatPipetz(poolAmount)}
        </span>
      </CardFooter>
    </Card>
  );
}

function RedemptionSpotlightCard({
  item,
  colorClass,
}: {
  item: CatalogItemRecord;
  colorClass: string;
}) {
  return (
    <Card variant="poster" className={`h-full justify-between gap-4 p-4 sm:p-5 ${colorClass}`}>
      <CardHeader className="gap-0">
        <CardDescription className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
          {item.type.replaceAll("_", " ")}
        </CardDescription>
        <CardTitle
          className="mt-4 text-2xl uppercase leading-none"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {item.name}
        </CardTitle>
        <CardContent className="mt-3">
          <p className="text-sm leading-6 text-[var(--color-ink-soft)]">{item.description}</p>
        </CardContent>
      </CardHeader>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        <span className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
          resgate instantaneo
        </span>
        <span className="text-sm font-black uppercase tracking-[0.08em] text-[var(--color-ink)]">
          {formatPipetz(item.cost)}
        </span>
      </CardFooter>
    </Card>
  );
}

function HeroPoster({
  heading,
  description,
  metrics,
}: {
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

      <div className="landing-plane relative z-10 mt-10 bg-[var(--color-paper)] p-6 lg:ml-10 lg:mt-12 lg:p-8">
        <div>
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
            <MetricCard
              key={metric.label}
              metric={metric}
              className={rotations[index % rotations.length]}
            />
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
    <section className="landing-plane landing-divider bg-[var(--color-paper-pink)] py-8 sm:py-10">
      <div className="mx-auto grid w-full max-w-[1520px] gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <div>
          <h2
            className="max-w-xl text-4xl uppercase leading-[0.9] sm:text-5xl"
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
              <FeatureStoryCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>

        <div className="landing-plane bg-[var(--color-sky)] p-6 sm:p-8">
          <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
            termometro da live . comunidade agora
          </p>

          <h3
            className="mt-4 max-w-md text-3xl uppercase leading-[0.92] sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            O que voces estao aprontando comigo agora.
          </h3>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {metrics.map((metric, index) => (
              <MetricCard
                key={metric.label}
                metric={metric}
                className={metricRotations[index % metricRotations.length]}
              />
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
    <aside className="p-6 sm:p-7">
      <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">top da live</p>

      <h2
        className="mt-4 max-w-[10ch] text-4xl uppercase leading-[0.88] sm:text-5xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Liderando agora
      </h2>

      <div className="mt-6 space-y-4">
        {leaders.map((entry, index) => {
          const viewer = "viewer" in entry ? entry.viewer : entry;
          const balance = "balance" in entry ? entry.balance : entry;

          return (
            <RankingLeaderCard
              key={viewer.id}
              index={index}
              bgClass={rowColors[index]}
              viewerName={viewer.youtubeDisplayName}
              balance={balance.currentBalance}
            />
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/ranking" className="btn-brutal ink-button px-5 py-3 text-xs">
          Ver ranking completo →
        </Link>
        {typeof viewerRank === "number" && viewerRank > 0 ? (
          <span className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
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
      <div className="p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
              ao vivo . {activeBet.options.length} opcoes abertas
            </p>

            <h2
              className="mt-4 max-w-2xl text-4xl uppercase leading-[0.9] sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {activeBet.question}
            </h2>

            <p className="mt-4 max-w-xl text-base leading-7 text-[var(--color-ink-soft)]">
              Quando eu abro uma aposta, voces escolhem um lado, entram no pool e tentam
              adivinhar o que vai acontecer comigo ao vivo.
            </p>

            <p className="mono mt-6 text-[11px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
              pool {formatPipetz(activeBet.totalPool)} . voces palpitando ao vivo
            </p>

            <div className="mt-6">
              <Link href="/apostas" className="btn-brutal accent-button px-5 py-3 text-xs">
                {loggedIn ? "Ir para apostas ↗" : "Ver apostas da live ↗"}
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            {activeBet.options.map((option, index) => (
              <SpotlightOptionCard
                key={option.id}
                optionLabel={option.label}
                poolAmount={option.poolAmount}
                index={index}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const featured = catalog.slice(0, 3);
  const colors = ["bg-[var(--color-blue)]", "bg-[var(--color-purple)]", "bg-[var(--color-pink)]"];

  return (
    <div className="p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <p className="mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink-soft)]">
            resgates . loja da comunidade
          </p>

          <h2
            className="mt-4 max-w-xl text-4xl uppercase leading-[0.9] sm:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Em breve.
          </h2>

          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--color-ink-soft)]">
            Quando nao tem aposta aberta, voces ainda conseguem mexer na live com sons,
            imagens e outras baguncas ao vivo.
          </p>

          <p className="mono mt-6 text-[11px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
            {catalog.length} itens ativos . som . imagem . caos
          </p>

          <div className="mt-6">
            <Link href="/resgates" className="btn-brutal ink-button px-5 py-3 text-xs">
              Explorar resgates →
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          {featured.map((item, index) => (
            <RedemptionSpotlightCard
              key={item.id}
              item={item}
              colorClass={colors[index % colors.length]}
            />
          ))}
        </div>
      </div>
    </div>
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

  return (
    <div className="flex w-full flex-col pb-20 pt-8">
      <section className="landing-plane surface-hero relative py-8 sm:py-10 lg:py-12">
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

        <div className="relative mx-auto grid w-full max-w-[1520px] gap-8 px-4 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-10">
          <div className="max-w-3xl">
            <p className="mono text-[11px] uppercase tracking-[0.36em] text-[var(--color-ink-soft)]">
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
                  <AuthButtons />
                  <Link href="/ranking" className="btn-brutal accent-button px-6 py-3 text-sm">
                    Ver ranking →
                  </Link>
                </>
              )}
            </div>

          </div>

          <HeroPoster
            heading={heroPosterHeading}
            description={heroPosterDescription}
            metrics={metrics}
          />
        </div>
      </section>

      <FeatureShowcase features={features} metrics={metrics} loggedIn={Boolean(session?.user)} />

      {false ? (
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

      <section className="landing-plane landing-divider bg-[var(--color-sky)] py-8 sm:py-10">
        <div className="mx-auto w-full max-w-[1520px] px-4 sm:px-6 lg:px-10">
          <RankingHeroCard leaderboard={leaderboard} viewerRank={viewerRank} />
        </div>
      </section>

      <section className="landing-plane landing-divider bg-[var(--color-paper)] py-8 sm:py-10">
        <div className="mx-auto w-full max-w-[1520px] px-4 sm:px-6 lg:px-10">
          <LiveSpotlight activeBet={activeBets[0]} catalog={catalog} loggedIn={Boolean(session?.user)} />
        </div>
      </section>

    </div>
  );
}
