"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import type { ViewerChannelOptionRecord } from "@/lib/types";

type ChannelsResponse = {
  activeViewerId: string | null;
  channels: ViewerChannelOptionRecord[];
};

export function ViewerChannelSwitcher() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const googleAccountId = session?.user?.googleAccountId;
  const sessionActiveViewerId = session?.user?.activeViewerId ?? "";
  const [channels, setChannels] = useState<ViewerChannelOptionRecord[]>([]);
  const [activeViewerId, setActiveViewerId] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!googleAccountId) {
      return;
    }

    let cancelled = false;

    async function loadChannels() {
      setIsLoading(true);

      const response = await fetch("/api/me/channels", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: ChannelsResponse;
      };

      if (cancelled) {
        return;
      }

      if (!response.ok || !payload.ok || !payload.data) {
        setChannels([]);
        setActiveViewerId(sessionActiveViewerId);
        setIsLoading(false);
        return;
      }

      setChannels(payload.data.channels);
      setActiveViewerId(payload.data.activeViewerId ?? "");
      setIsLoading(false);
    }

    void loadChannels();

    return () => {
      cancelled = true;
    };
  }, [googleAccountId, sessionActiveViewerId]);

  useEffect(() => {
    if (googleAccountId) {
      return;
    }

    let cleared = false;
    queueMicrotask(() => {
      if (cleared) {
        return;
      }
      setChannels([]);
      setActiveViewerId("");
      setIsLoading(false);
    });

    return () => {
      cleared = true;
    };
  }, [googleAccountId, sessionActiveViewerId]);

  if (!session?.user) {
    return null;
  }

  function handleSelection(nextViewerId: string) {
    const previousViewerId = activeViewerId;
    setActiveViewerId(nextViewerId);
    setFeedback(null);

    startTransition(async () => {
      const response = await fetch("/api/me/channels", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          viewerId: nextViewerId,
        }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        data?: ChannelsResponse;
        error?: string;
      };

      if (!response.ok || !payload.ok || !payload.data) {
        setActiveViewerId(previousViewerId);
        setFeedback(payload.error ?? "Nao foi possivel trocar o canal.");
        return;
      }

      setChannels(payload.data.channels);
      setActiveViewerId(payload.data.activeViewerId ?? nextViewerId);
      setFeedback("Canal ativo atualizado.");
      await update();
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="mono text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-ink-soft)]">
        Canal
      </span>
      <select
        value={activeViewerId}
        disabled={isLoading || isPending || channels.length === 0}
        onChange={(event) => handleSelection(event.target.value)}
        className="min-w-[170px] rounded-[var(--radius)] border-[2px] border-[var(--color-ink)] bg-[var(--color-paper)] px-3 py-2 text-xs font-bold text-[var(--color-ink)] shadow-[3px_3px_0_#000] outline-none"
        aria-label="Selecionar canal"
      >
        {channels.length === 0 ? (
          <option value="">{isLoading ? "Carregando..." : "Sem canais"}</option>
        ) : (
          channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.youtubeDisplayName}
            </option>
          ))
        )}
      </select>
      <span className="sr-only" aria-live="polite">
        {feedback}
      </span>
    </div>
  );
}
