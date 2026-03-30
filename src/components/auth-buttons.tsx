"use client";

import { getProviders, signIn, signOut, useSession } from "next-auth/react";
import { startTransition, useEffect, useState } from "react";

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
      <div className="flex items-center gap-3">
        <span className="retro-label hidden bg-[var(--color-lilac)] text-[var(--color-ink)] sm:inline-flex">
          {session.user.name ?? session.user.email}
        </span>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="btn-brutal bg-[var(--color-rose)] px-5 py-2.5 text-xs text-[var(--color-ink)]"
        >
          Sair
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
          className="btn-brutal bg-[var(--color-yellow)] px-6 py-2.5 text-sm text-[var(--color-ink)] shadow-[5px_5px_0_var(--shadow-color)]"
        >
          ★ Entrar com Google
        </button>
      ) : null}
      {hasCredentials ? (
        <button
          type="button"
          onClick={() => signIn("credentials", { email: "ana@example.com", callbackUrl: "/" })}
          className="btn-brutal bg-[var(--color-surface-strong)] px-5 py-2.5 text-xs text-[var(--color-ink)]"
        >
          Modo demo
        </button>
      ) : null}
    </div>
  );
}
