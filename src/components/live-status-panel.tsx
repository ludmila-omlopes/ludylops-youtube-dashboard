import { BridgeClientRecord } from "@/lib/types";
import { isBridgeOnline } from "@/lib/redemptions/service";
import { formatDateTime } from "@/lib/utils";

export function LiveStatusPanel({
  bridge,
}: {
  bridge: BridgeClientRecord[];
}) {
  const current = bridge[0];
  const online = isBridgeOnline(current?.lastSeenAt);

  return (
    <div className="panel relative overflow-hidden bg-[var(--color-lavender)] p-6">
      <div className="bg-dots-light pointer-events-none absolute inset-0 opacity-15" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="mono text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">
              Bridge da live
            </p>
            <h2
              className="mt-2 text-2xl font-bold uppercase"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {current?.label ?? "Aguardando conector"}
            </h2>
          </div>
          <div
            className="sticker px-4 py-2 text-sm text-[var(--color-ink)]"
            style={{ backgroundColor: online ? "var(--color-mint)" : "var(--color-pink)" }}
          >
            {online ? (
              <>
                <span className="pulse-live mr-1.5 inline-block h-2.5 w-2.5 rounded-full bg-green-600" />
                Online
              </>
            ) : (
              "Offline"
            )}
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="card-brutal bg-[var(--color-sky)] p-4">
            <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Ultimo heartbeat
            </p>
            <p className="mt-2 text-lg font-bold">{formatDateTime(current?.lastSeenAt)}</p>
          </div>
          <div className="card-brutal bg-[var(--color-periwinkle)] p-4">
            <p className="mono text-xs uppercase tracking-[0.28em] text-[var(--color-muted)]">
              Machine key
            </p>
            <p className="mt-2 text-lg font-bold">{current?.machineKey ?? "sem bridge"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
