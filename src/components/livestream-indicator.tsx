import { cn } from "@/lib/utils";

export function LivestreamIndicator({
  isLive,
  compact = false,
  className,
}: {
  isLive: boolean;
  compact?: boolean;
  className?: string;
}) {
  const liveClasses = isLive
    ? "bg-[var(--color-mint)] text-[var(--color-accent-ink)]"
    : "bg-[var(--color-paper)] text-[var(--color-ink-soft)]";

  return (
    <div
      className={cn(
        "sticker micro-flat inline-flex items-center gap-2 border-[3px] border-[var(--color-ink)] px-3 py-2 font-black uppercase tracking-[0.14em]",
        compact ? "text-[10px]" : "text-xs sm:text-sm",
        liveClasses,
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full border-2 border-[var(--color-ink)]",
          isLive ? "pulse-live bg-[var(--color-pink-hot)]" : "bg-[var(--color-paper-pink)]",
        )}
        aria-hidden="true"
      />
      <span>{isLive ? "Ao vivo agora" : "Offline"}</span>
    </div>
  );
}
