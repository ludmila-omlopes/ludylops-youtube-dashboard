"use client";

import Link from "next/link";
import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import { startTransition, useEffect, useState } from "react";

import { hasUsableAppSession } from "@/lib/auth/session-state";
import { ViewerChannelSwitcher } from "@/components/viewer-channel-switcher";
import { GOOGLE_AUTHORIZATION_PARAMS } from "@/lib/auth/google";
import { Button } from "@/components/ui/button";

export function AuthButtons() {
  const { data: session } = useSession();
  const hasUsableSession = hasUsableAppSession(session);
  const protectionStatus = session?.user?.accountProtectionStatus ?? null;
  const [providers, setProviders] = useState<Record<string, { id: string; name: string }> | null>(
    null,
  );
  const [showGoogleNotice, setShowGoogleNotice] = useState(false);
  const [isStartingGoogleSignIn, setIsStartingGoogleSignIn] = useState(false);

  useEffect(() => {
    startTransition(() => {
      getProviders().then((result) => {
        if (result) {
          setProviders(result);
        }
      });
    });
  }, []);

  useEffect(() => {
    if (!showGoogleNotice) {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isStartingGoogleSignIn) {
        setShowGoogleNotice(false);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isStartingGoogleSignIn, showGoogleNotice]);

  if (hasUsableSession) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <ViewerChannelSwitcher />
        <Button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          variant="neutral"
          size="sm"
        >
          Sair
        </Button>
      </div>
    );
  }

  const hasGoogle = Boolean(providers?.google);
  const hasCredentials = Boolean(providers?.credentials);

  const handleGoogleNoticeOpen = () => {
    setShowGoogleNotice(true);
  };

  const handleGoogleSignIn = () => {
    setIsStartingGoogleSignIn(true);
    void signIn("google", { callbackUrl: "/" }, GOOGLE_AUTHORIZATION_PARAMS);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        {hasGoogle ? (
          <Button type="button" onClick={handleGoogleNoticeOpen}>
            Entrar com Google
          </Button>
        ) : null}
        {hasCredentials ? (
          <Button
            type="button"
            onClick={() => signIn("credentials", { email: "ana@example.com", callbackUrl: "/" })}
            variant="accent"
            size="sm"
          >
            Modo demo
          </Button>
        ) : null}
        {protectionStatus ? (
          <Button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            variant="neutral"
            size="sm"
          >
            Limpar sessao
          </Button>
        ) : null}
      </div>

      {hasGoogle && showGoogleNotice ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm sm:p-6"
          onClick={() => {
            if (!isStartingGoogleSignIn) {
              setShowGoogleNotice(false);
            }
          }}
          role="presentation"
        >
          <div
            className="card-poster relative w-full max-w-xl border-[3px] border-[var(--color-ink)] bg-[var(--color-paper)] p-5 text-[var(--color-ink)] shadow-[10px_10px_0_#000] sm:p-6"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="google-login-warning-title"
          >
            <button
              type="button"
              onClick={() => setShowGoogleNotice(false)}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center border-[3px] border-[var(--color-ink)] bg-[var(--color-paper-pink)] text-lg font-black leading-none shadow-[4px_4px_0_#000] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              disabled={isStartingGoogleSignIn}
              aria-label="Fechar aviso"
            >
              x
            </button>
            <p className="mono pr-12 text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink-soft)]">
              login com google
            </p>
            <p
              id="google-login-warning-title"
              className="mt-3 max-w-[18ch] text-2xl font-black uppercase leading-[1.05] sm:text-3xl"
            >
              Antes de continuar, um recado rápido.
            </p>
            <p className="mt-4 text-sm font-medium leading-6 text-[var(--color-ink-soft)] sm:text-base">
              É possível que o Google mostre uma tela dizendo que este app ainda não foi
              verificado.
            </p>
            <p className="mt-3 text-sm font-medium leading-6 text-[var(--color-ink-soft)] sm:text-base">
              Isso acontece porque o app ainda está em processo de verificação. Por enquanto,
              esse aviso faz parte do fluxo normal do Google para apps que estão nessa etapa.
            </p>
            <p className="mt-3 text-sm font-medium leading-6 text-[var(--color-ink-soft)] sm:text-base">
              Se quiser, antes de seguir você pode dar uma olhada na nossa{" "}
              <Link href="/privacy" className="font-black underline decoration-[3px] underline-offset-4">
                Política de Privacidade
              </Link>
              .
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isStartingGoogleSignIn}
                className="justify-center"
              >
                {isStartingGoogleSignIn ? "Abrindo Google..." : "Continuar com Google"}
              </Button>
              <Button
                type="button"
                onClick={() => setShowGoogleNotice(false)}
                variant="neutral"
                size="sm"
                disabled={isStartingGoogleSignIn}
                className="justify-center"
              >
                Agora não
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
