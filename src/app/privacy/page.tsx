import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politica de Privacidade | Pipetz",
  description:
    "Como o Pipetz coleta, usa e protege dados de login Google e dados vinculados ao canal do YouTube.",
};

const LAST_UPDATED = "2026-04-08";
const SUPPORT_EMAIL = "ludmila.omlopes@gmail.com";

type PolicySection = {
  title: string;
  body: string[];
};

const sections: PolicySection[] = [
  {
    title: "Resumo",
    body: [
      "O Pipetz e um painel da comunidade da live da Ludylops. Esta politica explica quais dados podem ser coletados quando voce usa o login Google, participa das funcoes da live e vincula sua conta ao seu canal do YouTube.",
      "Os dados sao usados para autenticar voce, associar sua conta ao viewer correto, mostrar saldo e ranking, registrar apostas, resgates e sugestoes, e manter o funcionamento do app.",
    ],
  },
  {
    title: "Dados que podemos coletar",
    body: [
      "Dados basicos de login Google: nome, email, foto de perfil e identificador da conta Google.",
      "Quando voce concede permissao de YouTube ao app: identificador do canal, nome exibido e handle do canal retornados pela API do Google.",
      "Dados de uso dentro do Pipetz: viewer vinculado, saldo, historico de pontos, apostas, resgates, sugestoes de jogos, canais associados e informacoes necessarias para diagnosticar problemas de vinculacao.",
      "Dados tecnicos de sessao e seguranca, como cookies de autenticacao e logs basicos necessarios para manter o app funcionando e investigar falhas ou abuso.",
    ],
  },
  {
    title: "Como usamos esses dados",
    body: [
      "Para autenticar sua conta e manter sua sessao ativa no Pipetz.",
      "Para tentar vincular sua conta Google ao canal correto do YouTube e ao viewer correspondente no chat da live.",
      "Para operar as funcionalidades do app, incluindo painel do viewer, ranking, apostas, resgates, catalogo e sugestoes.",
      "Para corrigir erros de vinculacao, evitar duplicidade de viewers e prestar suporte quando voce reporta um problema.",
    ],
  },
  {
    title: "Compartilhamento",
    body: [
      "Seus dados nao sao vendidos.",
      "Eles podem ser processados por provedores tecnicos usados para operar o app, como Google para autenticacao e consulta do canal do YouTube, e servicos de hospedagem, banco de dados e observabilidade usados pelo Pipetz.",
      "Se voce clicar para abrir uma issue manualmente no GitHub, o conteudo que voce enviar seguira tambem as regras de privacidade do GitHub.",
    ],
  },
  {
    title: "Retencao e seguranca",
    body: [
      "Mantemos os dados pelo tempo necessario para operar o Pipetz, preservar o historico das interacoes da live, resolver problemas de conta e cumprir obrigacoes tecnicas ou legais.",
      "Buscamos limitar o acesso aos dados ao necessario para operar o app, mas nenhum sistema conectado a internet oferece garantia absoluta de seguranca.",
    ],
  },
  {
    title: "Seus controles",
    body: [
      "Voce pode parar de usar o login Google a qualquer momento e pode revogar o acesso do app nas configuracoes da sua Conta Google.",
      "Se quiser solicitar remocao de conta, desvinculacao ou tirar duvidas sobre estes dados, entre em contato pelo email de suporte informado abaixo.",
    ],
  },
  {
    title: "Contato",
    body: [
      `Email de suporte: ${SUPPORT_EMAIL}`,
      "Se esta politica mudar de forma relevante, a versao publicada nesta pagina sera atualizada.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <section className="panel surface-hero p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="retro-label accent-chip">documento publico</span>
            <h1
              className="mt-4 text-4xl uppercase leading-[0.9] sm:text-5xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Politica de privacidade
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--color-ink-soft)]">
              Esta pagina explica como o Pipetz acessa, usa e protege dados de autenticacao Google
              e de vinculacao com canal do YouTube.
            </p>
          </div>

          <div className="card-poster bg-[var(--color-paper)] p-4">
            <p className="mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
              ultima atualizacao
            </p>
            <p className="mt-2 text-lg font-black uppercase">{LAST_UPDATED}</p>
          </div>
        </div>
      </section>

      {sections.map((section, index) => (
        <section
          key={section.title}
          className={`panel p-6 sm:p-8 ${
            index % 3 === 0
              ? "bg-[var(--color-paper)]"
              : index % 3 === 1
                ? "bg-[var(--color-blue)]"
                : "bg-[var(--color-mint)]"
          }`}
        >
          <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
            secao {String(index + 1).padStart(2, "0")}
          </p>
          <h2
            className="mt-3 text-3xl uppercase leading-none sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {section.title}
          </h2>
          <div className="mt-5 space-y-4 text-sm font-medium leading-7 text-[var(--color-ink-soft)] sm:text-base">
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
      ))}

      <section className="panel bg-[var(--color-pink)] p-6 sm:p-8">
        <p className="mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-accent-ink)]">
          links uteis
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/" className="btn-brutal bg-[var(--color-paper)] px-5 py-3 text-xs text-[var(--color-ink)]">
            Voltar para a home
          </Link>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="btn-brutal bg-[var(--color-accent-yellow)] px-5 py-3 text-xs text-[var(--color-accent-ink)]"
          >
            Falar por email
          </a>
        </div>
      </section>
    </div>
  );
}
