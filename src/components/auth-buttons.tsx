"use client";

import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import { startTransition, useEffect, useState } from "react";

import { ViewerChannelSwitcher } from "@/components/viewer-channel-switcher";

export function AuthButtons() {
  const { data: session } = useSession();
  const [providers, setProviders] = useState<Record<string, { id: string; name: string }> | null>(null);

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
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="btn-brutal bg-[var(--color-paper)] px-5 py-2.5 text-xs text-[var(--color-ink)]"
        >
          Sair ←
        </button>
      </div>
    );
  }

  const hasGoogle = Boolean(providers?.google);
  const hasCredentials = Boolean(providers?.credentials);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {hasGoogle ? (
        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="btn-brutal ink-button px-6 py-2.5 text-sm"
        >
          Entrar com Google ↗
        </button>
      ) : null}
      {hasCredentials ? (
        <button
          type="button"
          onClick={() => signIn("credentials", { email: "ana@example.com", callbackUrl: "/" })}
          className="btn-brutal accent-button px-5 py-2.5 text-xs"
        >
          Modo demo →
        </button>
      ) : null}
    </div>
  );
}
