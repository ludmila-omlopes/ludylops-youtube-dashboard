"use client";

import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import { startTransition, useEffect, useState } from "react";

import { ViewerChannelSwitcher } from "@/components/viewer-channel-switcher";
import {
  GOOGLE_ACCOUNT_SWITCH_HINT,
  GOOGLE_AUTHORIZATION_PARAMS,
} from "@/lib/auth/google";
import { Button } from "@/components/ui/button";

export function AuthButtons({ showGoogleHint = false }: { showGoogleHint?: boolean }) {
  const { data: session } = useSession();
  const [providers, setProviders] = useState<Record<string, { id: string; name: string }> | null>(
    null,
  );

  useEffect(() => {
    startTransition(() => {
      getProviders().then((result) => {
        if (result) {
          setProviders(result);
        }
      });
    });
  }, []);

  if (session?.user) {
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        {hasGoogle ? (
          <Button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" }, GOOGLE_AUTHORIZATION_PARAMS)}
          >
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
      </div>
      {hasGoogle && showGoogleHint ? (
        <p className="max-w-sm text-xs font-medium leading-5 text-[var(--color-ink-soft)]">
          Tem mais de uma conta Google? {GOOGLE_ACCOUNT_SWITCH_HINT}
        </p>
      ) : null}
    </div>
  );
}
